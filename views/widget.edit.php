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

$form
	->addField($groupids_field)
	->addField($hostids_field);

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
	$items_field->setFilterPreselect($hostids_field !== null
		? [
			'id' => $hostids_field->getId(),
			'accept' => CMultiSelect::FILTER_PRESELECT_ACCEPT_ID,
			'submit_as' => 'hostid'
		]
		: []
	);
	$items_field->addClass('js-item-pattern-field');
	$form->addField($items_field);
}

if (array_key_exists('unit_type', $data['fields'])) {
	$form->addField(
		new CWidgetFieldSelectView($data['fields']['unit_type'])
	);
}

// Adiciona o script para controlar a visibilidade dos campos
if ($display_type_field !== null) {
	$form->addItem(new CScriptTag('
		jQuery(document).ready(function($) {
			var $displayType = $("[name=\'display_type\']");
			var $itemPatternField = $(".js-item-pattern-field");
			
			$displayType.on("change", function() {
				$itemPatternField.closest(".form-field-row").show();
			});
			
			// Inicialização
			$itemPatternField.closest(".form-field-row").show();
		});
	'));
}

$form->show();