<?php declare(strict_types = 0);
       
namespace Modules\EchartsWidget\Includes;

use Zabbix\Widgets\{
	CWidgetField,
	CWidgetForm,
	Fields\CWidgetFieldCheckBox,
	Fields\CWidgetFieldCheckBoxList,
	Fields\CWidgetFieldColor,
	Fields\CWidgetFieldIntegerBox,
	Fields\CWidgetFieldMultiSelectGroup,
	Fields\CWidgetFieldMultiSelectHost,
	Fields\CWidgetFieldMultiSelectOverrideHost,
	Fields\CWidgetFieldPatternSelectItem,
	Fields\CWidgetFieldRadioButtonList,
	Fields\CWidgetFieldSelect,
	Fields\CWidgetFieldTags,
	Fields\CWidgetFieldTextArea,
	Fields\CWidgetFieldTextBox,
	Fields\CWidgetFieldThresholds
};

/**
 * ECharts widget form.
 */
class WidgetForm extends CWidgetForm {

    public const DISPLAY_TYPE_GAUGE = 0;
    public const DISPLAY_TYPE_LIQUID = 1;
    public const DISPLAY_TYPE_PIE = 2;
    public const DISPLAY_TYPE_HBAR = 3;
    public const DISPLAY_TYPE_MULTI_GAUGE = 4;
    public const DISPLAY_TYPE_TREEMAP = 5;
    public const DISPLAY_TYPE_ROSE = 6;
    public const DISPLAY_TYPE_FUNNEL = 8;
    public const DISPLAY_TYPE_TREEMAP_SUNBURST = 9;
    public const DISPLAY_TYPE_LLD_TABLE = 10;

    public const UNIT_TYPE_NONE = 0;
    public const UNIT_TYPE_PERCENTAGE = 1;
    public const UNIT_TYPE_BITS = 2;

    public function addFields(): self {
        $this->addField(
            new CWidgetFieldMultiSelectGroup('groupids', _('Host groups'))
        )
        ->addField(
            new CWidgetFieldMultiSelectHost('hostids', _('Hosts'))
        );

        // Adicionar o campo override_hostid para quando o widget estiver em um dashboard de template
        if ($this->isTemplateDashboard()) {
            $this->addField(
                (new CWidgetFieldMultiSelectOverrideHost('override_hostid', _('Host')))
            );
        }
        
        $this->addField(
            (new CWidgetFieldPatternSelectItem('items', _('Item patterns')))
                ->setFlags(CWidgetField::FLAG_LABEL_ASTERISK)
        )
        ->addField(
            (new CWidgetFieldSelect('display_type', _('Chart Type'), [
                self::DISPLAY_TYPE_GAUGE => _('Gauge Chart'),
                self::DISPLAY_TYPE_LIQUID => _('Liquid Chart'),
                self::DISPLAY_TYPE_PIE => _('Pie Chart'),
                self::DISPLAY_TYPE_HBAR => _('Horizontal Bar Chart'),
                self::DISPLAY_TYPE_MULTI_GAUGE => _('Multi-level Gauge'),
                self::DISPLAY_TYPE_TREEMAP => _('Treemap Chart'),
                self::DISPLAY_TYPE_ROSE => _('Nightingale Rose Chart'),
                self::DISPLAY_TYPE_FUNNEL => _('Funnel Chart'),
                self::DISPLAY_TYPE_TREEMAP_SUNBURST => _('Treemap/Sunburst Chart'),
                self::DISPLAY_TYPE_LLD_TABLE => _('LLD Table')
            ]))
                ->setDefault(self::DISPLAY_TYPE_GAUGE)
                ->setFlags(CWidgetField::FLAG_NOT_EMPTY)
        );

        return $this;
    }
}