<?php declare(strict_types = 0);
/*
** Copyright (C) 2001-2025 Zabbix SIA
**
** This program is free software: you can redistribute it and/or modify it under the terms of
** the GNU Affero General Public License as published by the Free Software Foundation, version 3.
**
** This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
** without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
** See the GNU Affero General Public License for more details.
**
** You should have received a copy of the GNU Affero General Public License along with this program.
** If not, see <https://www.gnu.org/licenses/>.
**/

/**
 * ECharts widget form view.
 *
 * @var CView $this
 * @var array $data
 */

use Modules\EchartsWidget\Includes\WidgetForm;

$form = new CWidgetFormView($data);

$groupids_field = array_key_exists('groupids', $data['fields'])
	? new CWidgetFieldMultiSelectGroupView($data['fields']['groupids'])
	: null;

$hostids_field = $data['templateid'] === null && array_key_exists('hostids', $data['fields'])
	? (new CWidgetFieldMultiSelectHostView($data['fields']['hostids']))
		->setFilterPreselect([
			'id' => $groupids_field->getId(),
			'accept' => CMultiSelect::FILTER_PRESELECT_ACCEPT_ID,
			'submit_as' => 'groupid'
		])
	: null;

// Adicionar campo override_hostid para dashboard de template
$override_hostid_field = $data['templateid'] !== null && array_key_exists('override_hostid', $data['fields'])
	? new CWidgetFieldMultiSelectOverrideHostView($data['fields']['override_hostid'])
	: null;

$form
	->addField($groupids_field)
	->addField($hostids_field)
	->addField($override_hostid_field);

// Adiciona os campos na ordem correta
$display_type_field = null;
if (array_key_exists('display_type', $data['fields'])) {
	$display_type_field = new CWidgetFieldSelectView($data['fields']['display_type']);
	$form->addField($display_type_field);
}

// Determina o tipo de display atual
$display_type = WidgetForm::DISPLAY_TYPE_GAUGE;
if (array_key_exists('display_type', $data['fields'])) {
	$field = $data['fields']['display_type'];
	if (method_exists($field, 'getValue')) {
		$display_type = (int) $field->getValue();
	}
}

// Adiciona o campo de items
if (array_key_exists('items', $data['fields'])) {
	$items_field = new CWidgetFieldPatternSelectItemView($data['fields']['items']);
	
	if ($data['templateid'] === null) {
		// Para dashboard normal, filtra por host selecionado
		$items_field->setFilterPreselect($hostids_field !== null
			? [
				'id' => $hostids_field->getId(),
				'accept' => CMultiSelect::FILTER_PRESELECT_ACCEPT_ID,
				'submit_as' => 'hostid'
			]
			: []
		);
	}
	else if ($override_hostid_field !== null) {
		// Para dashboard de template, filtra pelo host de override
		$items_field->setFilterPreselect([
			'id' => $override_hostid_field->getId(),
			'accept' => CMultiSelect::FILTER_PRESELECT_ACCEPT_ID,
			'submit_as' => 'hostid'
		]);
	}
	
	$items_field->addClass('js-item-pattern-field');
	$form->addField($items_field);
}

if (array_key_exists('unit_type', $data['fields'])) {
	$form->addField(
		new CWidgetFieldSelectView($data['fields']['unit_type'])
	);
}

// Adiciona o script para controlar a visibilidade dos campos
$form->addItem(new CScriptTag('
	jQuery(document).ready(function($) {
		var $displayType = $("[name=\'display_type\']");
		var $itemPatternField = $(".js-item-pattern-field");
		var $groupsField = $("[name=\'groupids[]\']");
		var $hostsField = $("[name=\'hostids[]\']");
		var $overrideHostField = $("[name=\'override_hostid[]\']");
		
		// Função para verificar se há hosts ou grupos selecionados
		function checkHostsSelection() {
			var hasSelection = false;
			
			// Verificar campos de grupos e hosts em dashboards normais
			if ($groupsField.length && $groupsField.multiSelect("getData").length > 0) {
				hasSelection = true;
			}
			
			if ($hostsField.length && $hostsField.multiSelect("getData").length > 0) {
				hasSelection = true;
			}
			
			// Verificar campo de override_hostid em dashboards de template
			if ($overrideHostField.length && $overrideHostField.multiSelect("getData").length > 0) {
				hasSelection = true;
			}
			
			// Mostrar ou esconder campo de items baseado na seleção
			if (hasSelection) {
				$itemPatternField.closest(".form-field-row").show();
			} else {
				$itemPatternField.closest(".form-field-row").hide();
			}
		}
		
		// Monitora mudanças nos campos de seleção
		if ($groupsField.length) {
			$groupsField.on("change", checkHostsSelection);
		}
		
		if ($hostsField.length) {
			$hostsField.on("change", checkHostsSelection);
		}
		
		if ($overrideHostField.length) {
			$overrideHostField.on("change", checkHostsSelection);
		}
		
		// Verificar estado inicial
		checkHostsSelection();
		
		// Tipo de display também controla visibilidade
		$displayType.on("change", function() {
			checkHostsSelection();
		});
	});
'));

$form->show();