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
use Modules\EchartsWidget\Includes\WidgetForm;

class WidgetView extends CControllerDashboardWidgetView {

	protected function doAction(): void {
		$items_data = [];
		$items_meta = [];

		// Inicializar a resposta padrão vazia
		$data = [
			'name' => $this->getInput('name', $this->widget->getName()),
			'body' => '<div class="chart"></div>',
			'items_data' => $items_data,
			'items_meta' => $items_meta,
			'fields_values' => $this->fields_values,
			'display_type' => $this->fields_values['display_type'] ?? WidgetForm::DISPLAY_TYPE_GAUGE,
			'user' => [
				'debug_mode' => $this->getDebugMode()
			]
		];

		// Verificar se temos algum filtro de host ou grupo configurado
		$has_host_filter = false;
		
		// Dashboard de template com override_hostid
		if ($this->isTemplateDashboard() && !empty($this->fields_values['override_hostid'])) {
			$has_host_filter = true;
		}
		// Dashboard normal com hostids ou groupids
		else if (!empty($this->fields_values['hostids']) || !empty($this->fields_values['groupids'])) {
			$has_host_filter = true;
		}
		
		// Se não temos filtros, retornar dados vazios
		if (!$has_host_filter) {
			$this->setResponse(new CControllerResponseData($data));
			return;
		}
		
		// Continua apenas se tiver filtros configurados
		$options = [
			'output' => ['itemid', 'value_type', 'name', 'units', 'lastvalue', 'lastclock', 'delay', 'history'],
			'webitems' => true,
			'preservekeys' => true,
			'selectHosts' => ['name']
		];

		// Verificar se estamos em um dashboard de template e se o override_hostid está definido
		if ($this->isTemplateDashboard() && !empty($this->fields_values['override_hostid'])) {
			// Em dashboard de template com override_hostid definido, usamos o host especificado
			$options['hostids'] = $this->fields_values['override_hostid'];
		}
		else {
			// Caso contrário, seguimos o fluxo normal
			if (!empty($this->fields_values['groupids'])) {
				$options['groupids'] = $this->fields_values['groupids'];
			}

			if (!empty($this->fields_values['hostids'])) {
				$options['hostids'] = $this->fields_values['hostids'];
			}
		}

		if (!empty($this->fields_values['items'])) {
			$patterns = [];
			foreach ($this->fields_values['items'] as $pattern) {

				$cleanPattern = preg_replace('/^\*:\s*/', '', $pattern);
				$patterns[] = $cleanPattern;
			}
			
			$options['search'] = ['name' => $patterns];
			$options['searchByAny'] = true;
			$options['searchWildcardsEnabled'] = true;
		}


		if (!empty($this->fields_values['host_tags'])) {
			$options['hostTags'] = $this->fields_values['host_tags'];
			$options['evaltype'] = $this->fields_values['evaltype_host'];
		}


		if (!empty($this->fields_values['item_tags'])) {
			$options['tags'] = $this->fields_values['item_tags'];
			$options['evaltype'] = $this->fields_values['evaltype_item'];
		}

		$db_items = API::Item()->get($options);

		if ($db_items) {
			foreach ($db_items as $itemid => $item) {
	
				$value = $item['lastvalue'];
				
				if ($value !== null && $value !== '') {
					$raw_value = preg_replace('/[^\d.-]/', '', $value);
					$items_data[$itemid] = $raw_value;
				}
				else {
					$items_data[$itemid] = '0';
				}


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

		$columns = $this->fields_values['columns'] ?? [];
		foreach ($items_meta as $itemid => &$meta) {
			foreach ($columns as $column) {
				if (isset($column['item']) && $column['item'] == $itemid) {
					$meta['name'] = $column['name'] ?? $meta['name'];
					$meta['units'] = $column['units'] ?? $meta['units'];
					break;
				}
			}
		}
		unset($meta);

		// Atualizar os dados com os resultados da consulta
		$data['items_data'] = $items_data;
		$data['items_meta'] = $items_meta;
		
		$this->setResponse(new CControllerResponseData($data));
	}
}