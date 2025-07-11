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

		// Verificar se é um gráfico temporal e buscar dados históricos
		$display_type = $this->fields_values['display_type'] ?? WidgetForm::DISPLAY_TYPE_GAUGE;
		if ($display_type == WidgetForm::DISPLAY_TYPE_TEMPORAL_LINE || 
			$display_type == WidgetForm::DISPLAY_TYPE_TEMPORAL_AREA ||
			$display_type == WidgetForm::DISPLAY_TYPE_AREA_RAINFALL) {
			
			$items_history = $this->getHistoricalData($db_items);
			$data['items_history'] = $items_history;
		}

		// Atualizar os dados com os resultados da consulta
		$data['items_data'] = $items_data;
		$data['items_meta'] = $items_meta;
		$data['info'] = $this->makeWidgetInfo();
		
		$this->setResponse(new CControllerResponseData($data));
	}

	/**
	 * Get historical data for temporal charts
	 * @param array $items Items array from API
	 * @return array Historical data
	 */
	private function getHistoricalData(array $items): array {
		if (empty($items)) {
			return [];
		}

		// Get time period from widget configuration
		$time_period = $this->fields_values['time_period'] ?? [];
		
		// Handle different time period formats from CWidgetFieldTimePeriod
		if (!empty($time_period)) {
			// Check if it's already processed timestamps
			if (isset($time_period['from_ts']) && isset($time_period['to_ts'])) {
				$time_from = $time_period['from_ts'];
				$time_till = $time_period['to_ts'];
			}
			// Check for string format from/to
			elseif (isset($time_period['from']) && isset($time_period['to'])) {
				$time_from = $time_period['from'];
				$time_till = $time_period['to'];
				
				// Convert strings to timestamps
				if (is_string($time_from)) {
					$time_from = strtotime($time_from);
					if ($time_from === false) {
						$time_from = time() - 3600; // fallback to 1 hour ago
					}
				}
				if (is_string($time_till)) {
					$time_till = strtotime($time_till);
					if ($time_till === false) {
						$time_till = time(); // fallback to now
					}
				}
			}
			// Handle dashboard time filter integration
			else {
				$time_till = time();
				$time_from = $time_till - 3600; // Default to 1 hour
			}
		} else {
			// Default to last hour if no time period is set
			$time_till = time();
			$time_from = $time_till - 3600;
		}

		// Ensure we have valid timestamps
		if (!is_numeric($time_from) || !is_numeric($time_till)) {
			$time_till = time();
			$time_from = $time_till - 3600;
		}

		$history_data = [];

		foreach ($items as $itemid => $item) {
			// Determine history table based on value type
			$history_table = $this->getHistoryTable($item['value_type']);
			
			// Get history data via API
			$history_options = [
				'output' => ['clock', 'value'],
				'itemids' => [$itemid],
				'time_from' => $time_from,
				'time_till' => $time_till,
				'sortfield' => 'clock',
				'sortorder' => 'ASC',
				'limit' => 1000 // Limit to prevent memory issues
			];

			try {
				$item_history = API::History()->get($history_options);
				
				if (!empty($item_history)) {
					$history_data[$itemid] = array_map(function($point) {
						return [
							'clock' => (int)$point['clock'],
							'value' => is_numeric($point['value']) ? (float)$point['value'] : $point['value']
						];
					}, $item_history);
				} else {
					$history_data[$itemid] = [];
				}
			} catch (Exception $e) {
				
				$history_data[$itemid] = [];
			}
		}

		return $history_data;
	}

	/**
	 * Get appropriate history table based on value type
	 * @param int $value_type Item value type
	 * @return int History table identifier
	 */
	private function getHistoryTable(int $value_type): int {
		// Value types mapping to history tables
		// 0 - float, 1 - character, 2 - log, 3 - integer, 4 - text
		switch ($value_type) {
			case ITEM_VALUE_TYPE_FLOAT:
				return 0; // history
			case ITEM_VALUE_TYPE_UINT64:
				return 3; // history_uint
			case ITEM_VALUE_TYPE_STR:
				return 1; // history_str
			case ITEM_VALUE_TYPE_LOG:
				return 2; // history_log
			case ITEM_VALUE_TYPE_TEXT:
				return 4; // history_text
			default:
				return 0; // Default to float history
		}
	}

	/**
	 * Make widget specific info to show in widget's header.
	 */
	private function makeWidgetInfo(): array {
		$info = [];

		// Show time period info for temporal charts
		$display_type = $this->fields_values['display_type'] ?? WidgetForm::DISPLAY_TYPE_GAUGE;
		if (($display_type == WidgetForm::DISPLAY_TYPE_TEMPORAL_LINE || 
			 $display_type == WidgetForm::DISPLAY_TYPE_TEMPORAL_AREA ||
			 $display_type == WidgetForm::DISPLAY_TYPE_AREA_RAINFALL) &&
			!empty($this->fields_values['time_period']) &&
			isset($this->fields_values['time_period']['from']) &&
			isset($this->fields_values['time_period']['to'])) {
			
			$info[] = [
				'icon' => ZBX_ICON_TIME_PERIOD,
				'hint' => relativeDateToText($this->fields_values['time_period']['from'],
					$this->fields_values['time_period']['to']
				)
			];
		}

		return $info;
	}
}