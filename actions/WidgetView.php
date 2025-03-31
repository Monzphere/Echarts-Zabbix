<?php declare(strict_types = 0);
/*
** Zabbix
** Copyright (C) 2001-2023 Zabbix SIA
**
** This program is free software; you can redistribute it and/or modify
** it under the terms of the GNU General Public License as published by
** the Free Software Foundation; either version 2 of the License, or
** (at your option) any later version.
**
** This program is distributed in the hope that it will be useful,
** but WITHOUT ANY WARRANTY; without even the implied warranty of
** MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
** GNU General Public License for more details.
**
** You should have received a copy of the GNU General Public License
** along with this program; if not, write to the Free Software
** Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
**/


namespace Modules\EchartsWidget\Actions;

use API,
	CControllerDashboardWidgetView,
	CControllerResponseData;

class WidgetView extends CControllerDashboardWidgetView {

	protected function doAction(): void {
		$items_data = [];
		$items_meta = [];



		// Primeiro, busca os itens com informações detalhadas
		$db_items = API::Item()->get([
			'output' => ['itemid', 'value_type', 'name', 'units', 'lastvalue', 'lastclock', 'delay', 'history'],
			'itemids' => $this->fields_values['itemids'],
			'webitems' => true,
			'preservekeys' => true,
			'selectHosts' => ['name']
		]);


		if ($db_items) {
			foreach ($db_items as $itemid => $item) {
				// Usa o lastvalue do item
				$value = $item['lastvalue'];

				// Se não tiver lastvalue, tenta buscar do histórico
				if ($value === null || $value === '' || $value === '0') {
					$history = API::History()->get([
						'output' => ['value', 'clock'],
						'itemids' => $itemid,
						'history' => $item['value_type'],
						'sortfield' => 'clock',
						'sortorder' => ZBX_SORT_DOWN,
						'limit' => 1
					]);


					if ($history) {
						$value = $history[0]['value'];
					}
				}

				// Converte o valor usando as unidades do item
				if ($value !== null && $value !== '') {
					// Remove espaços e caracteres especiais, mantém apenas números, ponto e sinal
					$raw_value = preg_replace('/[^\d.-]/', '', $value);
					$items_data[$itemid] = $raw_value;

				}
				else {
					$items_data[$itemid] = '0';
				}

				// Adiciona metadados do item
				$items_meta[$itemid] = [
					'name' => $item['name'],
					'host' => $item['hosts'][0]['name'],
					'units' => $item['units'],
					'value_type' => $item['value_type'],
					'delay' => $item['delay'],
					'history' => $item['history'],
					'lastclock' => $item['lastclock']
				];
			}
		}

		$data = [
			'name' => $this->getInput('name', $this->widget->getName()),
			'body' => '<div class="chart"></div>',
			'items_data' => $items_data,
			'items_meta' => $items_meta,
			'fields_values' => $this->fields_values,
			'user' => [
				'debug_mode' => $this->getDebugMode()
			]
		];

		
		$this->setResponse(new CControllerResponseData($data));
	}
}

