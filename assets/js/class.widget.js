class WidgetEcharts extends CWidget {
    
    static CONFIG_TYPE_JSON = 0;
    static CONFIG_TYPE_JAVASCRIPT = 1;

    // Constants for unit types
    static UNIT_TYPE_NONE = 0;
    static UNIT_TYPE_PERCENTAGE = 1;
    static UNIT_TYPE_BITS = 2;

    // Constants for chart types
    static DISPLAY_TYPE_GAUGE = 0;
    static DISPLAY_TYPE_LIQUID = 1;
    static DISPLAY_TYPE_PIE = 2;
    static DISPLAY_TYPE_HBAR = 3;
    static DISPLAY_TYPE_MULTI_GAUGE = 4;
    static DISPLAY_TYPE_TREEMAP = 5;
    static DISPLAY_TYPE_ROSE = 6;
    static DISPLAY_TYPE_FUNNEL = 8;
    static DISPLAY_TYPE_TREEMAP_SUNBURST = 9;
    static DISPLAY_TYPE_LLD_TABLE = 10;
    static DISPLAY_TYPE_TEMPORAL_LINE = 11;
    static DISPLAY_TYPE_TEMPORAL_AREA = 12;
    static DISPLAY_TYPE_AREA_RAINFALL = 13;
    static DISPLAY_TYPE_SCATTER_EFFECT = 14;
    


    // Constants for trigger severity
    static TRIGGER_SEVERITY_COLORS = {
        0: '#97AAB3', // Not classified
        1: '#7499FF', // Information
        2: '#FFC859', // Warning
        3: '#FFA059', // Average
        4: '#E97659', // High
        5: '#E45959'  // Disaster
    };

    // Temas de cores disponíveis
    static COLOR_THEMES = {
        // Tema padrão
        [WidgetEcharts.COLOR_THEME_DEFAULT]: [
            '#5470c6',  // Azul
            '#91cc75',  // Verde
            '#fac858',  // Amarelo
            '#ee6666',  // Vermelho
            '#73c0de',  // Azul claro
            '#3ba272',  // Verde escuro
            '#fc8452',  // Laranja
            '#9a60b4',  // Roxo
            '#ea7ccc',  // Rosa
            '#c23531'   // Vermelho escuro
        ],
        // Tema cores do Zabbix
        [WidgetEcharts.COLOR_THEME_ZABBIX]: [
            '#7499FF',  // Azul Informativo
            '#FFC859',  // Amarelo Aviso
            '#FFA059',  // Laranja Médio
            '#E97659',  // Laranja-vermelho Alto
            '#E45959',  // Vermelho Desastre
            '#97AAB3',  // Cinza Não classificado
            '#009900',  // Verde
            '#0000EE',  // Azul escuro
            '#AA00BB',  // Roxo
            '#FF5500'   // Laranja vibrante
        ],
        // Tema de cores pastel
        [WidgetEcharts.COLOR_THEME_PASTEL]: [
            '#B5D8EB',  // Azul pastel
            '#C4E0B2',  // Verde pastel
            '#FFE699',  // Amarelo pastel
            '#FFCCCC',  // Vermelho pastel
            '#D4BBDD',  // Roxo pastel
            '#F2C1D5',  // Rosa pastel
            '#FFCBA4',  // Laranja pastel
            '#B5EAD7',  // Menta pastel
            '#E2F0CB',  // Verde-limão pastel
            '#FDCFDF'   // Magenta pastel
        ],
        // Tema de cores brilhantes
        [WidgetEcharts.COLOR_THEME_BRIGHT]: [
            '#0088FF',  // Azul brilhante
            '#00CC66',  // Verde brilhante
            '#FFCC00',  // Amarelo brilhante
            '#FF3333',  // Vermelho brilhante
            '#CC33FF',  // Roxo brilhante
            '#FF66CC',  // Rosa brilhante
            '#FF8800',  // Laranja brilhante
            '#00FFFF',  // Ciano brilhante
            '#66FF33',  // Lima brilhante
            '#FF33FF'   // Magenta brilhante
        ],
        // Tema de cores escuras
        [WidgetEcharts.COLOR_THEME_DARK]: [
            '#003366',  // Azul escuro
            '#006633',  // Verde escuro
            '#996633',  // Marrom escuro
            '#993333',  // Vermelho escuro
            '#660066',  // Roxo escuro
            '#990033',  // Borgonha escuro
            '#663300',  // Marrom-laranja escuro
            '#006666',  // Verde-azulado escuro
            '#333300',  // Verde oliva escuro
            '#330033'   // Púrpura escuro
        ],
        // Tema monocromático (tons de azul)
        [WidgetEcharts.COLOR_THEME_BLUE]: [
            '#0A2463',  // Azul mais escuro
            '#1E3888',  // Azul escuro
            '#3066BE',  // Azul médio-escuro
            '#5F9DF7',  // Azul médio
            '#8AB6F9',  // Azul médio-claro
            '#B6D0FA',  // Azul claro
            '#DAE7FB',  // Azul muito claro
            '#256EFF',  // Azul brilhante
            '#478FFF',  // Azul-ciano
            '#30BCED'   // Ciano
        ]
    };

    onInitialize() {
        super.onInitialize();

        this._refresh_frame = null;
        this._chart_container = null;
        this._chart = null;
        this._items_data = {};
        this._items_meta = {};
        this._items_history = {};
        this._fields_values = {
            display_type: 0,
            unit_type: 0,
            echarts_config: null,
            config_type: 0,
            color_theme: 0,
            time_period: {from: 'now-1h', to: 'now'},
            show_legend: true,
            show_grid: true,
            smooth_lines: false
        };
    }

    /**
     * Processa a resposta da atualização do widget
     * @param {Object} response - A resposta da API com os dados do widget
     */
    processUpdateResponse(response) {
        // Update internal data
        this._items_data = response.items_data || {};
        this._items_meta = response.items_meta || {};
        this._items_history = response.items_history || {};
        this._fields_values = response.fields_values || this._fields_values;
        
        // Processar valores em notação científica nos dados de resposta
        if (this._items_data) {
            Object.keys(this._items_data).forEach(itemId => {
                const value = this._items_data[itemId];
                
                // Verificar se o valor está em notação científica
                if (typeof value === 'string') {
                    // Tratar o caso "1.83e+8 bps"
                    const scientificWithUnitsMatch = value.match(/^(\d+\.\d+e[+-]\d+)\s*(\w+)$/i);
                    if (scientificWithUnitsMatch) {
                        const numValue = Number(scientificWithUnitsMatch[1]);
                        const unitValue = scientificWithUnitsMatch[2];
                        
                        if (!isNaN(numValue)) {                            
                            // Atualizar o valor para seu equivalente numérico
                            this._items_data[itemId] = numValue;
                            
                            // Atualizar/adicionar a unidade aos metadados
                            if (this._items_meta[itemId]) {
                                this._items_meta[itemId].units = unitValue;
                                this._items_meta[itemId].originalValue = value;
                            }
                        }
                    }
                    // Tratar valor em notação científica simples
                    else if (value.match(/^\d+\.\d+e[+-]\d+$/i)) {
                        const numValue = Number(value);
                        
                        if (!isNaN(numValue)) {
                            
                            // Atualizar o valor para seu equivalente numérico
                            this._items_data[itemId] = numValue;
                            
                            // Armazenar o valor original nos metadados
                            if (this._items_meta[itemId]) {
                                this._items_meta[itemId].originalValue = value;
                            }
                        }
                    }
                }
            });
        }

        // Prepare fields for context
        const fields = [];
        for (const [itemid, value] of Object.entries(this._items_data)) {
            const numericValue = parseFloat(value);
            
            if (isNaN(numericValue)) {
                console.warn(`Invalid value for item ${itemid}:`, value);
                continue;
            }
            
            // Get item metadata
            const meta = this._items_meta[itemid];
            if (!meta) continue;

            const field = {
                id: itemid,
                name: meta.name || `Item ${itemid}`,
                value: numericValue,
                values: [numericValue],
                units: meta.units || '',
                host: meta.host || 'Unknown host',
                value_type: meta.value_type || '0',
                delay: meta.delay || '0',
                history: meta.history || '7d',
                lastclock: meta.lastclock || ''
            };

            fields.push(field);
        }

        // Update context
        this._context = {
            panel: {
                data: {
                    series: [{
                        fields: fields
                    }]
                },
                chart: null
            },
            zabbix: {
                items: {...this._items_data},
                items_meta: {...this._items_meta},
                items_history: {...this._items_history}
            },
            helpers: {
                formatDate: (timestamp) => {
                    return new Date(timestamp * 1000).toLocaleString();
                },
                formatNumber: (value, decimals = 2) => {
                    return Number(value).toFixed(decimals);
                },
                formatBytes: (bytes) => {
                    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
                    let value = Math.abs(bytes);
                    let unitIndex = 0;
                    
                    while (value >= 1024 && unitIndex < units.length - 1) {
                        value /= 1024;
                        unitIndex++;
                    }
                    
                    return value.toFixed(2) + ' ' + units[unitIndex];
                },
                generateColors: (count) => {
                    return Array(count).fill(0).map((_, i) => this._getColorByIndex(i));
                }
            }
        };

        // Set contents
        this.setContents(response);
    }

    setContents(response) {
        if (this._chart === null) {
            super.setContents(response);

            this._chart_container = this._body.querySelector('.chart');
            if (!this._chart_container) {
                console.error('Chart container not found');
                return;
            }

            // Ajusta o estilo do container para ocupar todo o espaço disponível sem scroll
            this._chart_container.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                overflow: visible;
            `;
            
            try {
                // Initialize with dark theme and automatic renderer
                this._chart = echarts.init(this._chart_container, 'dark', {
                    renderer: 'canvas',
                    useDirtyRect: true
                });

                // Base configuration
                const baseOptions = {
                    backgroundColor: 'transparent',
                    textStyle: {
                        color: '#fff'
                    }
                };

                this._chart.setOption(baseOptions);

                // Register events
                this._chart.on('click', (params) => {
                    
                });

                this._resizeChart();
            }
            catch (error) {
                console.error('Error initializing chart:', error);
                return;
            }
        }

        this._updateChart();
    }

    _updateChart() {
        try {
            if (!this._chart || !this._context || !this._context.panel || !this._context.panel.data) {
                console.error('Context or chart not initialized correctly');
                return;
            }

            const data = this._context.panel.data.series[0];
            if (!data || !data.fields) {
                console.error('Data not available in expected format');
                return;
            }

            let options;
            const displayType = parseInt(this._fields_values.display_type);

            // Configuração base do tooltip que será mesclada com as configurações específicas
            const baseTooltipConfig = {
                confine: false,
                enterable: true,
                appendToBody: true,
                position: function (point, params, dom, rect, size) {
                    // Obtém as dimensões e posição do widget
                    const widgetEl = document.querySelector('.dashboard-grid-widget-container');
                    const widgetRect = widgetEl ? widgetEl.getBoundingClientRect() : null;
                    
                    // Calcula a posição ideal do tooltip
                    const viewWidth = document.documentElement.clientWidth;
                    const viewHeight = document.documentElement.clientHeight;
                    const tooltipWidth = size.contentSize[0];
                    const tooltipHeight = size.contentSize[1];
                    
                    // Posição inicial (à direita do ponto)
                    let x = point[0] + 15;
                    let y = point[1];
                    
                    // Ajusta horizontalmente se necessário
                    if (x + tooltipWidth > viewWidth) {
                        x = point[0] - tooltipWidth - 15;
                    }
                    
                    // Ajusta verticalmente se necessário
                    if (y + tooltipHeight > viewHeight) {
                        y = Math.max(0, viewHeight - tooltipHeight);
                    }
                    
                    return [x, y];
                },
                backgroundColor: 'rgba(50, 50, 50, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderWidth: 1,
                padding: [10, 15],
                textStyle: {
                    color: '#fff',
                    fontSize: 12
                },
                extraCssText: 'box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); border-radius: 4px; z-index: 1000000 !important; pointer-events: all !important;'
            };

            switch (displayType) {
                case WidgetEcharts.DISPLAY_TYPE_MULTI_GAUGE:
                    options = this._createMultiGaugeChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_HBAR:
                    options = this._createHorizontalBarChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_GAUGE:
                    options = this._createGaugeChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_LIQUID:
                    
                    options = this._createGaugeChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_PIE:
                    options = this._createPieChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_TREEMAP:
                    options = this._createTreemapChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_ROSE:
                    options = this._createRoseChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_FUNNEL:
                    options = this._createFunnelChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_TREEMAP_SUNBURST:
                    options = this._createTreemapSunburstChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_LLD_TABLE:
                    options = this._createLLDTableChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_TEMPORAL_LINE:
                    options = this._createTemporalLineChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_TEMPORAL_AREA:
                    options = this._createTemporalAreaChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_AREA_RAINFALL:
                    options = this._createAreaRainfallChart(data);
                    break;
                case WidgetEcharts.DISPLAY_TYPE_SCATTER_EFFECT:
                    options = this._createScatterEffectChart(data);
                    break;
                default:
                    console.error('Unsupported chart type:', displayType);
                    return;
            }

            if (!options) {
                console.error('Chart options not generated correctly');
                return;
            }

            // Mescla a configuração base do tooltip com as opções específicas do gráfico
            if (options.tooltip) {
                options.tooltip = { ...baseTooltipConfig, ...options.tooltip };
            } else {
                options.tooltip = baseTooltipConfig;
            }

            // Apply base options common to all charts
            const baseOptions = {
                backgroundColor: 'transparent'
            };

            // Merge base options with specific chart options
            const finalOptions = {...baseOptions, ...options};

            // Limpa eventos e handlers antigos antes de atualizar
            this._chart.off();
            
            // Add temporal class for styling
            if (displayType === WidgetEcharts.DISPLAY_TYPE_TEMPORAL_LINE || 
                displayType === WidgetEcharts.DISPLAY_TYPE_TEMPORAL_AREA) {
                this._chart_container.classList.add('temporal');
            } else {
                this._chart_container.classList.remove('temporal');
            }

            // Atualiza o gráfico com as novas opções
            
            this._chart.setOption(finalOptions, true);
            
            // Log para verificar se o chart foi atualizado corretamente
            setTimeout(() => {
                
                if (displayType === WidgetEcharts.DISPLAY_TYPE_LIQUID) {
                    
                }
            }, 100);
            
            // Reregistra os eventos necessários
            this._chart.on('click', (params) => {
                
            });
        }
        catch (error) {
            console.error('Error updating chart:', error);
        }
    }

    _createMultiGaugeChart(data) {
        const fields = data.fields;
        if (!fields || !fields.length) return null;

        const value = parseFloat(fields[0].value);
        if (isNaN(value)) return null;

        const atual = value;
        const desejado = value <= 70 ? Math.max(0, value - atual) : 30;
        const naodesejado = Math.max(0, 100 - atual - desejado);
        
        const textStyle = {
            fontSize: 14,
            fontWeight: 'normal'
        };

        const gaugeData = [
            {
                value: atual,
                name: 'Current',
                title: {
                    ...textStyle,
                    offsetCenter: ['0%', '-40%'],
                    color: '#5470c6'
                },
                detail: {
                    ...textStyle,
                    valueAnimation: true,
                    offsetCenter: ['0%', '-25%'],
                    formatter: function(value) {
                        return value.toFixed(2) + '%';
                    },
                    backgroundColor: 'transparent',
                    borderRadius: 10,
                    padding: [5, 10],
                    color: '#5470c6'
                },
                itemStyle: {
                    color: '#5470c6'
                }
            },
            {
                value: desejado,
                name: 'Desired',
                title: {
                    ...textStyle,
                    offsetCenter: ['0%', '0%'],
                    color: '#91cc75'
                },
                detail: {
                    ...textStyle,
                    valueAnimation: true,
                    offsetCenter: ['0%', '15%'],
                    formatter: function(value) {
                        return value.toFixed(2) + '%';
                    },
                    backgroundColor: 'transparent',
                    borderRadius: 10,
                    padding: [5, 10],
                    color: '#91cc75'
                },
                itemStyle: {
                    color: '#91cc75'
                }
            },
            {
                value: naodesejado,
                name: 'Undesired',
                title: {
                    ...textStyle,
                    offsetCenter: ['0%', '40%'],
                    color: '#fac858'
                },
                detail: {
                    ...textStyle,
                    valueAnimation: true,
                    offsetCenter: ['0%', '55%'],
                    formatter: function(value) {
                        return value.toFixed(2) + '%';
                    },
                    backgroundColor: 'transparent',
                    borderRadius: 10,
                    padding: [5, 10],
                    color: '#fac858'
                },
                itemStyle: {
                    color: '#fac858'
                }
            }
        ];

        return {
            series: [{
                type: 'gauge',
                startAngle: 90,
                endAngle: -270,
                center: ['50%', '50%'],
                radius: '80%',
                pointer: {
                    show: false
                },
                progress: {
                    show: true,
                    overlap: false,
                    roundCap: true,
                    clip: false,
                    itemStyle: {
                        borderWidth: 0
                    }
                },
                axisLine: {
                    lineStyle: {
                        width: 20,
                        color: [[1, 'rgba(255,255,255,0.1)']]
                    }
                },
                splitLine: {
                    show: false
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    show: false
                },
                data: gaugeData,
                title: {
                    ...textStyle
                },
                detail: {
                    ...textStyle,
                    width: 80,
                    height: 20,
                    borderWidth: 0
                }
            }]
        };
    }

    _getColorByIndex(index) {
        // Verificar se há cor principal definida
        const primaryColor = this._getPrimaryColor();
        
        if (primaryColor) {
            // Se há cor principal, gerar variações baseadas nela para múltiplas séries
            if (index === 0) {
                return primaryColor; // Primeira série usa a cor principal
            } else {
                // Gerar variações para séries adicionais
                return this._generateColorVariation(primaryColor, index);
            }
        }
        
        // Caso contrário, usar cores padrão do ECharts
        const defaultColors = [
            '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
            '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#c23531'
        ];
        
        return defaultColors[index % defaultColors.length];
    }
    
    /**
     * Get primary color defined by user
     * @returns {string|null} Primary color string or null
     */
    _getPrimaryColor() {
        // Verificar se temos a cor definida no campo value_color
        if (this._fields_values.value_color && this._fields_values.value_color.trim() !== '') {
            const color = this._fields_values.value_color.replace('#', '');
            return '#' + color;
        }
        
        // Verificar campo alternativo primary_color (retrocompatibilidade)
        if (this._fields_values.primary_color && this._fields_values.primary_color.trim() !== '') {
            return '#' + this._fields_values.primary_color.replace('#', '');
        }
        
        // Retornar null para usar cores padrão quando não há cor definida
        return null;
    }
    
    /**
     * Generate color variation based on primary color
     * @param {string} baseColor Base color in hex format
     * @param {number} index Index for variation
     * @returns {string} Color variation
     */
    _generateColorVariation(baseColor, index) {
        // Gerar variações da cor base
        const variations = this._generateColorPalette(baseColor);
        return variations[index % variations.length];
    }
    
    /**
     * Generate color palette based on base color
     * @param {string} baseColor Base color in hex format
     * @returns {Array} Array of color variations
     */
    _generateColorPalette(baseColor) {
        // Verificar se a cor base é válida, senão usar cor padrão
        if (!baseColor || typeof baseColor !== 'string') {
            baseColor = '#5470c6';
        }
        
        const baseRgb = this._hexToRgb(baseColor);
        
        // Se a conversão falhar, usar RGB padrão
        if (!baseRgb) {
            const variations = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'];
            return variations;
        }
        
        const variations = [baseColor];
        
        // Gerar 9 variações adicionais
        for (let i = 1; i < 10; i++) {
            const hsl = this._rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
            
            // Ajustar matiz, saturação e luminosidade
            const newHue = (hsl.h + (i * 36)) % 360; // Rotacionar matiz
            const newSat = Math.max(0.3, Math.min(1, hsl.s + (i % 2 === 0 ? -0.1 : 0.1)));
            const newLight = Math.max(0.2, Math.min(0.8, hsl.l + (i % 3 === 0 ? -0.1 : 0.1)));
            
            const newRgb = this._hslToRgb(newHue, newSat, newLight);
            const newHex = this._rgbToHex(newRgb.r, newRgb.g, newRgb.b);
            variations.push(newHex);
        }
        
        return variations;
    }
    
    /**
     * Convert hex to RGB
     */
    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    /**
     * Convert RGB to HSL
     */
    _rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h: h * 360, s, l };
    }
    
    /**
     * Convert HSL to RGB
     */
    _hslToRgb(h, s, l) {
        h /= 360;
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    /**
     * Convert RGB to hex
     */
    _rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    /**
     * Get all colors from the current theme
     * @returns {Array} Array of color strings
     */
    _getCurrentThemeColors() {
        const themeType = parseInt(this._fields_values.color_theme || WidgetEcharts.COLOR_THEME_DEFAULT);
        return WidgetEcharts.COLOR_THEMES[themeType] || 
               WidgetEcharts.COLOR_THEMES[WidgetEcharts.COLOR_THEME_DEFAULT];
    }
    
    /**
     * Get a set of colors for multiple series with better distribution
     * @param {number} count Number of colors needed
     * @returns {Array} Array of color strings
     */
    _getDistributedColors(count) {
        const result = [];
        
        // Gerar cores baseadas na cor principal ou usar padrão
        for (let i = 0; i < count; i++) {
            result.push(this._getColorByIndex(i));
        }
        
        return result;
    }

    _getColorByValue(value, min, max) {
        // Define thresholds for color ranges
        const thresholds = [
            { value: 20, color: '#91cc75' },   // Verde para valores baixos
            { value: 40, color: '#5470c6' },   // Azul para valores médio-baixos
            { value: 60, color: '#fac858' },   // Amarelo para valores médios
            { value: 80, color: '#fc8452' },   // Laranja para valores médio-altos
            { value: 100, color: '#ee6666' }   // Vermelho para valores altos
        ];

        const percentage = ((value - min) / (max - min)) * 100;
        
        for (let i = 0; i < thresholds.length; i++) {
            if (percentage <= thresholds[i].value) {
                return thresholds[i].color;
            }
        }
        return thresholds[thresholds.length - 1].color;
    }

    _formatValueWithUnits(value, units) {
        try {
            if (value === null || value === undefined) {
                return 'N/A';
            }

            // Tratamento direto para valor em notação científica + unidade
            if (typeof value === 'string') {
                // Verificar padrão como "1.83e+8 bps"
                const scientificWithUnitsMatch = value.match(/^(\d+\.\d+e[+-]\d+)\s*(\w+)$/i);
                if (scientificWithUnitsMatch) {
                    const numValue = Number(scientificWithUnitsMatch[1]);
                    const unitValue = scientificWithUnitsMatch[2].toLowerCase();
                    
                    if (!isNaN(numValue)) {
                        // Se a unidade for bps, usar formatação de bits
                        if (unitValue === 'bps') {
                            return this._formatBitsValue(numValue);
                        }
                        // Outras unidades científicas também podem ser processadas aqui
                    }
                }
                
                // Verificar se é apenas notação científica sem unidade
                if (value.match(/^\d+\.\d+e[+-]\d+$/i)) {
                    const numValue = Number(value);
                    if (!isNaN(numValue)) {
                        // Se temos unidades separadas, usamos elas para formatar
                        if (units) {
                            if (/bps/i.test(units)) {
                                return this._formatBitsValue(numValue);
                            }
                        }
                        // Sem unidades específicas, apenas formatamos o número
                        return this._formatNumberBySize(numValue);
                    }
                }
            }

            // Processar valor numérico normal
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                return String(value);
            }

            // Se não houver unidades definidas, retorna apenas o valor formatado
            if (!units) {
                return this._formatNumberBySize(numValue);
            }

            // Processar com base nas unidades
            const normalizedUnits = units.toLowerCase().trim();

            // Caso especial para unidades bps (bits por segundo)
            if (/bps$/i.test(normalizedUnits)) {
                return this._formatBitsValue(numValue);
            }

            // Se a unidade for B, KB, MB, GB, TB ou variações, formata como bytes
            if (/^[kmgt]?b$/i.test(normalizedUnits.replace(/\s+/g, ''))) {
                return this._formatBytesValue(numValue);
            }

            // Se a unidade terminar com /s, formata com as unidades apropriadas
            if (normalizedUnits.endsWith('/s')) {
                return this._formatRateValue(numValue);
            }

            // Se a unidade for %, mantém como percentual
            if (normalizedUnits === '%' || normalizedUnits.includes('percent')) {
                return this._formatPercentValue(numValue);
            }

            // Para valores simples sem conversão especial
            return this._formatNumberBySize(numValue) + (units ? ' ' + units : '');

        } catch (error) {
            console.error('Error formatting value:', error, value, units);
            return String(value) + (units ? ' ' + units : '');
        }
    }
    
    // Adicionar um método específico para a tabela LLD
    _formatLLDTableValue(value, units) {
        // Para valores em notação científica (ex: 1.83e+8 bps)
        if (typeof value === 'string' && value.match(/^\d+\.\d+e[+-]\d+\s+bps$/i)) {
            const numericPart = value.split(' ')[0];
            const numericValue = Number(numericPart);
            if (!isNaN(numericValue)) {
                return this._formatBitsValue(numericValue);
            }
        }
        
        // Outros casos, usar o formatador geral
        return this._formatValueWithUnits(value, units);
    }
    
    _formatNumberBySize(value) {
        const absValue = Math.abs(value);
        
        if (absValue === 0) {
            return '0';
        } else if (absValue >= 1000000000) {
            return (value / 1000000000).toFixed(2) + ' G';
        } else if (absValue >= 1000000) {
            return (value / 1000000).toFixed(2) + ' M';
        } else if (absValue >= 1000) {
            return (value / 1000).toFixed(2) + ' K';
        } else if (absValue < 0.01 && absValue > 0) {
            return value.toExponential(2);
        } else {
            return value.toFixed(2);
        }
    }
    
    _formatBitsValue(value) {
        // Garantir que estamos trabalhando com um número
        value = Number(value);
        const absValue = Math.abs(value);
        
        if (absValue >= 1000000000) {
            return (value / 1000000000).toFixed(2) + ' Gbps';
        } else if (absValue >= 1000000) {
            return (value / 1000000).toFixed(2) + ' Mbps';
        } else if (absValue >= 1000) {
            return (value / 1000).toFixed(2) + ' Kbps';
        } else {
            return value.toFixed(2) + ' bps';
        }
    }
    
    _formatBytesValue(value) {
        const absValue = Math.abs(value);
        
        if (absValue >= 1099511627776) {  // 1024^4
            return (value / 1099511627776).toFixed(2) + ' TB';
        } else if (absValue >= 1073741824) {  // 1024^3
            return (value / 1073741824).toFixed(2) + ' GB';
        } else if (absValue >= 1048576) {  // 1024^2
            return (value / 1048576).toFixed(2) + ' MB';
        } else if (absValue >= 1024) {
            return (value / 1024).toFixed(2) + ' KB';
        } else {
            return value.toFixed(2) + ' B';
        }
    }
    
    _formatRateValue(value) {
        // Simplificar para usar a formatação de bits
        return this._formatBitsValue(value);
    }
    
    _formatPercentValue(value) {
        return value.toFixed(2) + '%';
    }

    _createHorizontalBarChart(data) {
        if (typeof this._currentPage === 'undefined') {
            this._currentPage = 1;
        }

        let chartData = data.fields
            .map(field => ({
                name: field.name.replace('Container /', ''),
                value: parseFloat(field.value),
                units: field.units || ''
            }))
            .filter(item => !isNaN(item.value))
            .sort((a, b) => b.value - a.value);

        const itemsPerPage = 10;
        let displayData = chartData.slice(0, itemsPerPage).reverse();

        const chartOptions = {
            grid: {
                left: '15%',
                right: '5%',
                bottom: chartData.length > itemsPerPage ? '30px' : '10px',
                top: '0',
                containLabel: false
            },
            tooltip: {
                trigger: 'item',
                formatter: params => `${params.name}: ${this._formatValueWithUnits(params.value, params.data.units)}`
            },
            xAxis: {
                type: 'value',
                axisLabel: { show: false },
                axisTick: { show: false },
                axisLine: { show: false },
                splitLine: { show: false }
            },
            yAxis: {
                type: 'category',
                data: displayData.map(item => item.name),
                axisLabel: {
                    show: true,
                    fontSize: 11,
                    formatter: (value, index) => this._formatValueWithUnits(displayData[index].value, displayData[index].units),
                    align: 'right'
                },
                axisTick: { show: false },
                axisLine: { show: false },
                splitLine: { show: false }
            },
            series: [{
                type: 'bar',
                data: displayData.map((item, index) => ({
                    ...item,
                    itemStyle: {
                        color: this._getColorByIndex(index),
                        borderColor: '#e0e0e0',
                        borderWidth: 1
                    }
                })),
                label: {
                    show: true,
                    position: 'insideLeft',
                    formatter: params => {
                        const maxLength = 30;
                        let label = params.name;
                        if (label.length > maxLength) {
                            label = label.substring(0, maxLength - 3) + '...';
                        }
                        return label;
                    },
                    fontSize: 11,
                    distance: 5,
                    color: '#000000'
                },
                barCategoryGap: 1,
                barGap: 0,
                barWidth: null
            }]
        };

        if (chartData.length > itemsPerPage && this._chart_container) {
            const existingLink = this._chart_container.querySelector('.show-more-link');
            if (existingLink) {
                existingLink.remove();
            }

            const showMoreLink = document.createElement('a');
            showMoreLink.href = '#';
            showMoreLink.textContent = 'Show more';
            showMoreLink.className = 'show-more-link';
            showMoreLink.style.cssText = `
                color: #1976d2;
                text-decoration: none;
                cursor: pointer;
                position: absolute;
                bottom: 5px;
                right: 5%;
                font-size: 11px;
            `;
            
            showMoreLink.onclick = (e) => {
                e.preventDefault();
                this._showMorePopup(chartData, itemsPerPage);
            };
            
            this._chart_container.appendChild(showMoreLink);
        }

        return chartOptions;
    }

    _showMorePopup(chartData, itemsPerPage) {
        const existingPopup = document.querySelector('.chart-popup-overlay');
        if (existingPopup) {
            existingPopup.remove();
        }

        const isDarkTheme = document.body.classList.contains('theme-dark');
        const themeColors = {
            light: {
                background: '#ffffff',
                text: '#1f2c33',
                border: '#dfe4e7',
                headerBg: '#f8f8f8'
            },
            dark: {
                background: '#0f1215',
                text: '#ebeef0',
                border: '#383838',
                headerBg: '#1c2026'
            }
        };
        const colors = isDarkTheme ? themeColors.dark : themeColors.light;

        const overlay = document.createElement('div');
        overlay.className = 'chart-popup-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const popup = document.createElement('div');
        popup.className = 'chart-popup';
        popup.style.cssText = `
            background: ${colors.background};
            padding: 20px;
            border-radius: 2px;
            max-width: 800px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            color: ${colors.text};
            border: 1px solid ${colors.border};
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            position: absolute;
            right: 10px;
            top: 10px;
            border: none;
            background: none;
            font-size: 24px;
            cursor: pointer;
            padding: 0 8px;
            color: ${colors.text};
            opacity: 0.7;
            transition: opacity 0.2s;
        `;
        closeButton.onmouseover = () => closeButton.style.opacity = '1';
        closeButton.onmouseout = () => closeButton.style.opacity = '0.7';
        closeButton.onclick = () => overlay.remove();

        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 11px;
        `;

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid ${colors.border}; background: ${colors.headerBg};">Name</th>
                <th style="text-align: right; padding: 8px; border-bottom: 1px solid ${colors.border}; background: ${colors.headerBg};">Value</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        chartData.forEach((item, index) => {
            if (index >= itemsPerPage) {
                const row = document.createElement('tr');
                row.style.cssText = `
                    border-bottom: 1px solid ${colors.border};
                    transition: background-color 0.2s;
                `;
                row.onmouseover = () => row.style.backgroundColor = isDarkTheme ? '#2f3236' : '#f2f4f5';
                row.onmouseout = () => row.style.backgroundColor = 'transparent';
                
                row.innerHTML = `
                    <td style="text-align: left; padding: 8px;">${item.name}</td>
                    <td style="text-align: right; padding: 8px;">${this._formatValueWithUnits(item.value, item.units)}</td>
                `;
                tbody.appendChild(row);
            }
        });
        table.appendChild(thead);
        table.appendChild(tbody);

        popup.appendChild(closeButton);
        popup.appendChild(table);
        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        };
    }

    _createGaugeChart(data) {
        if (!data.fields || !data.fields.length) {
            return null;
        }

        const field = data.fields[0];
        const value = parseFloat(field.value);
        
        if (isNaN(value)) {
            return null;
        }

        return {
            tooltip: {
                formatter: (params) => {
                    return `${field.name}: ${value.toFixed(2)}${field.units || ''}`;
                }
            },
            grid: {
                top: 8,
                bottom: 8,
                left: 8,
                right: 8,
                containLabel: true
            },
            series: [{
                type: 'gauge',
                startAngle: 180,
                endAngle: 0,
                min: 0,
                max: 100,
                radius: '80%',
                center: ['50%', '65%'],
                splitNumber: 5,
                axisLine: {
                    lineStyle: {
                        width: 10,
                        color: [
                            [0.3, '#91cc75'],  // 0-30% verde
                            [0.7, '#fac858'],  // 30-70% amarelo
                            [1, '#ee6666']     // 70-100% vermelho
                        ]
                    }
                },
                pointer: {
                    icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
                    length: '85%',
                    width: 4,
                    offsetCenter: [0, 0],
                    itemStyle: {
                        color: 'auto'
                    }
                },
                axisTick: {
                    distance: -8,
                    length: 4,
                    lineStyle: {
                        color: '#fff',
                        width: 1
                    }
                },
                splitLine: {
                    distance: -10,
                    length: 6,
                    lineStyle: {
                        color: '#fff',
                        width: 1
                    }
                },
                axisLabel: {
                    color: '#999',
                    distance: -28,
                    fontSize: 12,
                    formatter: (value) => {
                        return value + '%';
                    }
                },
                anchor: {
                    show: true,
                    showAbove: true,
                    size: 10,
                    itemStyle: {
                        color: '#999'
                    }
                },
                title: {
                    show: true,
                    offsetCenter: [0, '40%'],
                    fontSize: 20,
                    color: '#999'
                },
                detail: {
                    valueAnimation: true,
                    fontSize: 20,
                    offsetCenter: [0, '15%'],
                    formatter: (value) => {
                        return value.toFixed(2) + '%';
                    },
                    color: 'inherit'
                },
                data: [{
                    value: value,
                    name: field.name
                }]
            }]
        };
    }

    // _createLiquidChart - Temporarily disabled
    // LiquidFill plugin causes rendering issues, using gauge chart as fallback
    _createLiquidChart(data) {
        
        return this._createGaugeChart(data);
    }

    _createPieChart(data) {
        const fields = data.fields;
        if (!fields || !fields.length) return null;
        
        // Determinar a cor do tema atual
        const isDarkTheme = document.body.classList.contains('dark-theme');
        const textColor = isDarkTheme ? '#ffffff' : '#000000';
        
        // Get distributed colors for all series
        const distributedColors = this._getDistributedColors(fields.length);
        
        // Preparar dados para o gráfico de pizza
        const chartData = fields.map((field, index) => ({
            value: parseFloat(field.value),
            name: field.name,
            units: field.units || '',
            itemStyle: {
                color: distributedColors[index]
            }
        })).filter(item => !isNaN(item.value));
        
        if (chartData.length === 0) return null;
        
        // Se tivermos apenas um item, mostrar como "valor vs. 100-valor"
        if (chartData.length === 1) {
            const item = chartData[0];
            const remaining = 100 - item.value;
            
            return {
                tooltip: {
                    trigger: 'item',
                    formatter: (params) => {
                        if (params.name === 'Remaining') {
                            return 'Remaining: ' + remaining.toFixed(2) + '%';
                        }
                        return `${params.name}: ${this._formatValueWithUnits(params.value, item.units)}`;
                    }
                },
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    data: [item.name, 'Remaining'],
                    textStyle: {
                        color: textColor
                    }
                },
                series: [{
                    name: item.name,
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        formatter: (params) => {
                            if (params.name === 'Remaining') {
                                return params.value.toFixed(2) + '%';
                            }
                            return this._formatValueWithUnits(params.value, item.units);
                        },
                        color: textColor
                    },
                    data: [
                        { value: item.value, name: item.name, itemStyle: { color: this._getColorByIndex(0) } },
                        { value: remaining, name: 'Remaining', itemStyle: { color: '#999' } }
                    ]
                }]
            };
        }
        
        // Se tivermos múltiplos itens, mostrar todos em um gráfico de pizza
        return {
            tooltip: {
                trigger: 'item',
                formatter: (params) => {
                    const item = chartData.find(i => i.name === params.name);
                    if (item) {
                        return `${params.name}: ${this._formatValueWithUnits(params.value, item.units)}`;
                    }
                    return `${params.name}: ${params.value}`;
                }
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                data: chartData.map(item => item.name),
                textStyle: {
                    color: textColor
                }
            },
            series: [{
                type: 'pie',
                radius: ['30%', '70%'],
                center: ['55%', '50%'],
                roseType: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    formatter: (params) => {
                        const item = chartData.find(i => i.name === params.name);
                        if (item) {
                            return this._formatValueWithUnits(params.value, item.units);
                        }
                        return params.value;
                    },
                    color: textColor
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: textColor
                    }
                },
                data: chartData
            }]
        };
    }

    _createTreemapChart(data) {
        // Prepare treemap data structure
        const items = data.fields;
        
        if (!items || !items.length) {
            return null;
        }
        
        // Get unit type configuration
        const unitType = parseInt(this._fields_values.unit_type || WidgetEcharts.UNIT_TYPE_NONE);
        
        // Group items by host if available
        const treeData = [];
        const hostGroups = {};
        
        // First, group by host
        items.forEach(item => {
            const host = item.host || 'Unknown';
            if (!hostGroups[host]) {
                hostGroups[host] = {
                    name: host,
                    children: []
                };
                treeData.push(hostGroups[host]);
            }
            
            // Add item to host group with appropriate value formatting
            const value = Math.abs(parseFloat(item.value));
            hostGroups[host].children.push({
                name: item.name.replace('Container /', ''), // Remove o prefixo "Container /" para melhor visualização
                value: value,
                itemId: item.id,
                rawValue: value, // Store raw value for tooltip
                units: item.units // Armazena as unidades para uso no tooltip
            });
        });
        
        // Function to define levels appearance
        function getLevelOption() {
            return [
                {
                    itemStyle: {
                        borderWidth: 0,
                        gapWidth: 5
                    }
                },
                {
                    itemStyle: {
                        gapWidth: 1
                    }
                }
            ];
        }
        
        // Encontrar valor mínimo e máximo para a escala de cores
        const allValues = [];
        treeData.forEach(host => {
            host.children.forEach(item => {
                allValues.push(item.value);
            });
        });
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);

        // Adicionar cores aos dados
        let colorIndex = 0;
        treeData.forEach(host => {
            host.children.forEach(item => {
                item.itemStyle = {
                    color: this._getColorByIndex(colorIndex++)
                };
            });
        });

        return {
            tooltip: {
                formatter: info => {
                    const value = info.data.rawValue;
                    const treePathInfo = info.treePathInfo;
                    const treePath = [];
                    
                    for (let i = 1; i < treePathInfo.length; i++) {
                        treePath.push(treePathInfo[i].name);
                    }
                    
                    // Format value based on unit type and stored units
                    let formattedValue = this._formatValueWithUnits(value, info.data.units);
                    
                    return [
                        '<div style="font-weight: bold; margin-bottom: 5px;">' +
                        treePath.join(' / ') +
                        '</div>',
                        'Valor: ' + formattedValue
                    ].join('');
                }
            },
            series: [{
                name: 'Metrics',
                type: 'treemap',
                top: 30,
                bottom: 10,
                left: 10,
                right: 10,
                roam: 'scale',
                nodeClick: true,
                breadcrumb: {
                    show: true,
                    height: 25,
                    top: 0,
                    left: 10,
                    right: 10,
                    emptyItemWidth: 25,
                    itemStyle: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        borderColor: 'rgba(255, 255, 255, 0.7)',
                        borderWidth: 1,
                        textStyle: {
                            color: '#fff'
                        }
                    }
                },
                visualMin: minValue,
                visualMax: maxValue,
                label: {
                    show: true,
                    formatter: params => {
                        const name = params.name.replace('Container /', '');
                        const value = this._formatValueWithUnits(params.value, params.data.units);
                        
                        // Ajusta o tamanho do texto baseado no tamanho do retângulo
                        const rectArea = params.area;
                        const isSmallRect = rectArea < 2000; // Ajuste este valor conforme necessário
                        
                        if (isSmallRect) {
                            // Para retângulos pequenos, mostra apenas o valor
                            return value;
                        }
                        
                        // Para retângulos maiores, mostra nome e valor
                        return name + '\n' + value;
                    },
                    ellipsis: true,
                    fontSize: 11,
                    color: '#fff',
                    rich: {
                        value: {
                            fontSize: 10,
                            lineHeight: 14,
                            color: 'rgba(255, 255, 255, 0.9)'
                        }
                    }
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 1,
                    gapWidth: 1,
                    borderRadius: 2
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 12,
                        fontWeight: 'bold'
                    },
                    itemStyle: {
                        borderWidth: 2
                    }
                },
                levels: getLevelOption(),
                data: treeData,
                animation: true,
                animationDuration: 500,
                animationEasing: 'cubicOut'
            }]
        };
    }

    _createRoseChart(data) {
        const items = data.fields;
        if (!items || !items.length) {
            return null;
        }

        // Get distributed colors for all series
        const distributedColors = this._getDistributedColors(items.length);
        
        // Preparar dados para o gráfico
        const chartData = items.map((item, index) => ({
            value: Math.abs(parseFloat(item.value)),
            name: item.name,
            itemStyle: {
                color: distributedColors[index]
            }
        }));

        // Calcular o raio baseado no tamanho do container
        const containerWidth = this._chart_container.clientWidth;
        const containerHeight = this._chart_container.clientHeight;
        const minDimension = Math.min(containerWidth, containerHeight);
        const maxRadius = Math.floor(minDimension * 0.4); // 40% do menor lado
        const minRadius = Math.floor(maxRadius * 0.2); // 20% do raio máximo

        return {
            legend: {
                type: 'scroll',
                orient: 'horizontal',
                bottom: 10,
                textStyle: {
                    fontSize: 11
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: params => {
                    const item = items.find(i => i.name === params.name);
                    if (!item) return params.name;

                    let value = this._formatValueWithUnits(params.value, item.units);
                    let unitSuffix = '';
                    
                    const unitType = parseInt(this._fields_values.unit_type || WidgetEcharts.UNIT_TYPE_NONE);
                    if (unitType === WidgetEcharts.UNIT_TYPE_PERCENTAGE) {
                        if (value.endsWith('%')) {
                            value = value.replace(/%$/, '');
                        }
                        unitSuffix = '%';
                    } else if (unitType === WidgetEcharts.UNIT_TYPE_BITS) {
                        unitSuffix = 'bps';
                    } else if (item.units) {
                        if (!value.endsWith(item.units)) {
                            unitSuffix = item.units;
                        }
                    }

                    return `${params.name}: ${value} ${unitSuffix}`;
                }
            },
            toolbox: {
                show: true,
                feature: {
                    saveAsImage: { 
                        show: true,
                        title: 'Save as Image'
                    }
                },
                right: 20,
                top: 0
            },
            series: [{
                name: 'Metrics',
                type: 'pie',
                radius: [minRadius, maxRadius],
                center: ['50%', '50%'],
                roseType: 'area',
                itemStyle: {
                    borderRadius: 4,
                    borderColor: '#fff',
                    borderWidth: 1
                },
                label: {
                    show: true,
                    formatter: params => {
                        const item = items.find(i => i.name === params.name);
                        if (!item) return params.name;

                        let value = this._formatValueWithUnits(params.value, item.units);
                        let unitSuffix = '';
                        
                        const unitType = parseInt(this._fields_values.unit_type || WidgetEcharts.UNIT_TYPE_NONE);
                        if (unitType === WidgetEcharts.UNIT_TYPE_PERCENTAGE) {
                            if (value.endsWith('%')) {
                                value = value.replace(/%$/, '');
                            }
                            unitSuffix = '%';
                        } else if (unitType === WidgetEcharts.UNIT_TYPE_BITS) {
                            unitSuffix = 'bps';
                        } else if (item.units) {
                            if (!value.endsWith(item.units)) {
                                unitSuffix = item.units;
                            }
                        }

                        return `${value} ${unitSuffix}`;
                    },
                    fontSize: 11
                },
                data: chartData
            }]
        };
    }

    _createLLDTableChart(data) {


        if (!this._chart_container || !data.fields || !data.fields.length) {
            console.warn('No data or container available for LLD table', {
                container: !!this._chart_container,
                fields: !!data.fields,
                length: data.fields?.length
            });
            return {
                series: [],
                tooltip: {
                    show: false
                }
            };
        }

        // Clear and set up the container
        this._chart_container.innerHTML = '';
        this._chart_container.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            padding: 0;
            margin: 0;
            overflow: hidden;
            background: var(--widget-bg-color);
        `;

        // Create table container for scrolling
        const tableContainer = document.createElement('div');
        tableContainer.style.cssText = `
            flex: 1;
            overflow: auto;
            margin: 0;
            padding: 0;
            width: 100%;
        `;

        // Process data
        const lldData = new Map();
        const metrics = new Set();
        const columnUnits = this._fields_values.column_units || { columns: [], units: [] };

        data.fields.forEach(field => {
            const parts = field.name.split(': ');
            if (parts.length < 2) return;

            const metricName = parts[parts.length - 1];
            const entityName = parts.slice(0, -1).join(': ');

            metrics.add(metricName);

            if (!lldData.has(entityName)) {
                lldData.set(entityName, new Map());
            }

            lldData.get(entityName).set(metricName, {
                value: field.value,
                units: field.units,
                valuemapid: field.valuemapid,
                name: field.name,
                itemid: field.itemid
            });
        });

        const metricsList = Array.from(metrics).sort();
        let sortedEntities = Array.from(lldData.entries());
        
        // Estado de ordenação
        if (!this._sortState) {
            this._sortState = {
                column: metricsList[0], // Primeira métrica por padrão
                direction: 'desc'       // Descendente por padrão
            };
        }

        // Função de ordenação
        const sortData = (column, direction) => {
            this._sortState.column = column;
            this._sortState.direction = direction;

            if (column === 'name') {
                sortedEntities.sort((a, b) => {
                    return direction === 'asc' ? 
                        a[0].localeCompare(b[0]) : 
                        b[0].localeCompare(a[0]);
                });
            } else {
                sortedEntities.sort((a, b) => {
                    const valueA = parseFloat(a[1].get(column)?.value || 0);
                    const valueB = parseFloat(b[1].get(column)?.value || 0);
                    return direction === 'asc' ? valueA - valueB : valueB - valueA;
                });
            }
        };

        // Ordenação inicial
        sortData(this._sortState.column, this._sortState.direction);

        // Create table
        const table = document.createElement('table');
        table.className = 'list-table';
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin: 0;
            padding: 0;
            table-layout: fixed;
        `;

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        // Calculate column widths
        const totalColumns = metricsList.length + 1;
        const nameColumnWidth = '30%';
        const metricColumnWidth = `${70 / metricsList.length}%`;

        // Função para criar seta de ordenação
        const createSortArrow = (column) => {
            const arrow = document.createElement('span');
            arrow.style.cssText = `
                margin-left: 5px;
                opacity: ${column === this._sortState.column ? '1' : '0.3'};
            `;
            arrow.textContent = this._sortState.direction === 'asc' ? '↑' : '↓';
            return arrow;
        };

        // Add Name column header
        const nameHeader = document.createElement('th');
        nameHeader.style.cssText = `
            position: sticky;
            top: 0;
            background: var(--widget-bg-color);
            padding: 5px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
            z-index: 1;
            width: ${nameColumnWidth};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: pointer;
        `;
        
        const nameHeaderText = document.createElement('span');
        nameHeaderText.textContent = 'Name';
        nameHeader.appendChild(nameHeaderText);
        nameHeader.appendChild(createSortArrow('name'));
        
        nameHeader.onclick = () => {
            const newDirection = this._sortState.column === 'name' && this._sortState.direction === 'asc' ? 'desc' : 'asc';
            sortData('name', newDirection);
            updateTableContent(currentPage);
            updateHeaders();
        };
        
        headerRow.appendChild(nameHeader);

        // Função para atualizar cabeçalhos
        const updateHeaders = () => {
            const headers = headerRow.querySelectorAll('th');
            headers.forEach(header => {
                const arrow = header.querySelector('span:last-child');
                if (arrow) {
                    arrow.style.opacity = header.dataset.column === this._sortState.column ? '1' : '0.3';
                    arrow.textContent = this._sortState.direction === 'asc' ? '↑' : '↓';
                }
            });
        };

        // Add metric headers
        metricsList.forEach(metric => {
            const th = document.createElement('th');
            th.dataset.column = metric;
            th.style.cssText = `
                position: sticky;
                top: 0;
                background: var(--widget-bg-color);
                padding: 5px;
                text-align: right;
                border-bottom: 1px solid var(--border-color);
                z-index: 1;
                width: ${metricColumnWidth};
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                cursor: pointer;
            `;
            
            const metricText = document.createElement('span');
            metricText.textContent = metric;
            th.appendChild(metricText);
            th.appendChild(createSortArrow(metric));
            
            th.onclick = () => {
                const newDirection = this._sortState.column === metric && this._sortState.direction === 'asc' ? 'desc' : 'asc';
                sortData(metric, newDirection);
                updateTableContent(currentPage);
                updateHeaders();
            };
            
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        
        // Pagination variables
        const itemsPerPage = 10;
        let currentPage = 1;
        const totalPages = Math.ceil(sortedEntities.length / itemsPerPage);

        // Function to format value based on column unit type
        const formatValueByColumn = (value, metricName) => {
            if (value === null || value === undefined) {
                return 'N/A';
            }

            try {
                // Verificar primeiro se é notação científica
                if (typeof value === 'string' && value.match(/^\d+\.\d+e[+-]\d+/)) {
                    // Encontra os dados da métrica para obter as unidades
                    let metricData = null;
                    for (const [entityName, metricsMap] of sortedEntities) {
                        if (metricsMap.has(metricName)) {
                            metricData = metricsMap.get(metricName);
                            break;
                        }
                    }
                    
                    // Se encontrou a métrica, usa o método específico para LLD
                    if (metricData) {
                        return this._formatLLDTableValue(value, metricData.units);
                    }
                    
                    // Se o valor parece ser "notação bps" (como 1.83e+8 bps)
                    if (value.includes('bps')) {
                        const parts = value.split(' ');
                        const numValue = Number(parts[0]);
                        if (!isNaN(numValue)) {
                            return this._formatBitsValue(numValue);
                        }
                    }
                    
                    // Para outros valores científicos
                    const numValue = Number(value);
                    if (!isNaN(numValue)) {
                        return this._formatNumberBySize(numValue);
                    }
                }
                
                // Para valores numéricos normais
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    return value;
                }

                // Encontra os dados da métrica
                let metricData = null;
                for (const [entityName, metricsMap] of sortedEntities) {
                    if (metricsMap.has(metricName)) {
                        metricData = metricsMap.get(metricName);
                        break;
                    }
                }

                if (!metricData) {
                    return numValue.toFixed(2);
                }

                const units = metricData.units;
                
                // Usar nosso método genérico para formatação
                return this._formatValueWithUnits(numValue, units);
                
            } catch (error) {
                console.error('Error formatting LLD value:', error);
                return 'Error';
            }
        };

        // Function to update table content
        const updateTableContent = (page) => {
            tbody.innerHTML = '';
            
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, sortedEntities.length);

            for (let i = startIndex; i < endIndex; i++) {
                const [entityName, metricsMap] = sortedEntities[i];
                const row = document.createElement('tr');
                
                // Add entity name cell
                const nameCell = document.createElement('td');
                nameCell.textContent = entityName;
                nameCell.style.cssText = `
                    padding: 5px;
                    text-align: left;
                    border-bottom: 1px solid var(--border-color);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    width: ${nameColumnWidth};
                `;
                row.appendChild(nameCell);

                // Add metric cells
                metricsList.forEach(metric => {
                    const td = document.createElement('td');
                    const metricData = metricsMap.get(metric);
                    
                    let displayValue = 'N/A';
                    
                    if (metricData && metricData.value !== null && metricData.value !== undefined) {
                        displayValue = formatValueByColumn(metricData.value, metric);
                    }

                    td.textContent = displayValue;
                    td.style.cssText = `
                        padding: 5px;
                        text-align: right;
                        border-bottom: 1px solid var(--border-color);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        width: ${metricColumnWidth};
                    `;
                    row.appendChild(td);
                });

                tbody.appendChild(row);
            }
        };

        table.appendChild(tbody);
        tableContainer.appendChild(table);

        // Create pagination controls
        const paginationDiv = document.createElement('div');
        paginationDiv.style.cssText = `
            padding: 5px;
            text-align: center;
            border-top: 1px solid var(--border-color);
            background: var(--widget-bg-color);
            flex-shrink: 0;
            width: 100%;
        `;

        const updatePaginationControls = () => {
            paginationDiv.innerHTML = '';
            
            if (totalPages <= 1) return;

            const prevButton = document.createElement('button');
            prevButton.textContent = '←';
            prevButton.style.cssText = `
                margin: 0 5px;
                padding: 2px 8px;
                cursor: pointer;
            `;
            prevButton.disabled = currentPage === 1;
            prevButton.onclick = () => {
                if (currentPage > 1) {
                    currentPage--;
                    updateTableContent(currentPage);
                    updatePaginationControls();
                }
            };
            paginationDiv.appendChild(prevButton);

            const pageInfo = document.createElement('span');
            pageInfo.style.margin = '0 10px';
            pageInfo.textContent = `${currentPage} / ${totalPages}`;
            paginationDiv.appendChild(pageInfo);

            const nextButton = document.createElement('button');
            nextButton.textContent = '→';
            nextButton.style.cssText = `
                margin: 0 5px;
                padding: 2px 8px;
                cursor: pointer;
            `;
            nextButton.disabled = currentPage === totalPages;
            nextButton.onclick = () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    updateTableContent(currentPage);
                    updatePaginationControls();
                }
            };
            paginationDiv.appendChild(nextButton);
        };

        // Initialize table content and controls
        updateTableContent(1);
        updatePaginationControls();

        // Append containers to chart container
        this._chart_container.appendChild(tableContainer);
        this._chart_container.appendChild(paginationDiv);

        return {
            series: [],
            tooltip: {
                show: false
            },
            grid: {
                show: false
            }
        };
    }

    _createFunnelChart(data) {
        const fields = data.fields;
        if (!fields || !fields.length) return null;
        
        // Determinar a cor do tema atual
        const isDarkTheme = document.body.classList.contains('dark-theme');
        const textColor = isDarkTheme ? '#ffffff' : '#000000';
        
        // Get distributed colors for all series
        const distributedColors = this._getDistributedColors(fields.length);
        
        // Preparar dados para o gráfico de funil
        const chartData = fields.map((field, index) => ({
            value: parseFloat(field.value),
            name: field.name,
            units: field.units || '',
            itemStyle: {
                color: distributedColors[index]
            }
        })).filter(item => !isNaN(item.value));
        
        if (chartData.length === 0) return null;
        
        return {
            tooltip: {
                trigger: 'item',
                formatter: (params) => {
                    const item = chartData.find(i => i.name === params.name);
                    if (item) {
                        return `${params.name}: ${this._formatValueWithUnits(params.value, item.units)}`;
                    }
                    return `${params.name}: ${params.value}`;
                }
            },
            legend: {
                data: chartData.map(item => item.name),
                textStyle: {
                    color: textColor
                }
            },
            series: [{
                type: 'funnel',
                left: '10%',
                top: 60,
                bottom: 60,
                width: '80%',
                min: 0,
                max: Math.max(...chartData.map(item => item.value)) * 1.1,
                minSize: '0%',
                maxSize: '100%',
                sort: 'descending',
                gap: 2,
                label: {
                    show: true,
                    position: 'inside',
                    formatter: (params) => {
                        const item = chartData.find(i => i.name === params.name);
                        if (item) {
                            return `${params.name}: ${this._formatValueWithUnits(params.value, item.units)}`;
                        }
                        return `${params.name}: ${params.value}`;
                    },
                    color: textColor
                },
                labelLine: {
                    length: 10,
                    lineStyle: {
                        width: 1,
                        type: 'solid',
                        color: textColor
                    }
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 1
                },
                emphasis: {
                    label: {
                        fontSize: 14,
                        color: textColor
                    }
                },
                data: chartData
            }]
        };
    }

    _createTreemapSunburstChart(data) {
        if (!data.fields || !data.fields.length) {
            return null;
        }

        // Process data into hierarchical structure
        const processedData = this._processDataForHierarchy(data.fields);

        // Generate random colors for each host
        const colorMap = new Map();
        processedData.forEach(host => {
            colorMap.set(host.name, this._generateRandomColor());
            host.children.forEach(child => {
                colorMap.set(child.name, this._generateRandomColor());
            });
        });

        // Create treemap configuration
        const treemapOption = {
            series: [{
                type: 'treemap',
                id: 'metrics-hierarchy',
                animationDurationUpdate: 2000,
                roam: false,
                nodeClick: undefined,
                data: processedData.map(host => ({
                    ...host,
                    itemStyle: {
                        color: colorMap.get(host.name)
                    },
                    children: host.children.map(child => ({
                        ...child,
                        itemStyle: {
                            color: colorMap.get(child.name)
                        }
                    }))
                })),
                universalTransition: true,
                label: {
                    show: true,
                    formatter: (params) => {
                        return params.name + '\n' + this._formatValueWithUnits(params.value, params.data.units);
                    },
                    fontSize: 11
                },
                breadcrumb: {
                    show: false
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 1
                }
            }]
        };

        // Create sunburst configuration
        const sunburstOption = {
            series: [{
                type: 'sunburst',
                id: 'metrics-hierarchy',
                radius: ['20%', '90%'],
                animationDurationUpdate: 2000,
                nodeClick: undefined,
                data: processedData.map(host => ({
                    ...host,
                    itemStyle: {
                        color: colorMap.get(host.name)
                    },
                    children: host.children.map(child => ({
                        ...child,
                        itemStyle: {
                            color: colorMap.get(child.name)
                        }
                    }))
                })),
                universalTransition: true,
                itemStyle: {
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,.5)'
                },
                label: {
                    show: true,
                    formatter: (params) => {
                        const isLeaf = !params.data.children;
                        if (isLeaf) {
                            return this._formatValueWithUnits(params.value, params.data.units);
                        }
                        return params.name.length > 15 ? params.name.substring(0, 15) + '...' : params.name;
                    },
                    rotate: 'tangential',
                    fontSize: 10,
                    minAngle: 15
                }
            }]
        };

        // Set initial option
        let currentOption = treemapOption;
        this._chart.setOption(currentOption);

        // Clear existing interval if any
        if (this._chartTransitionInterval) {
            clearInterval(this._chartTransitionInterval);
        }

        // Set up transition interval
        this._chartTransitionInterval = setInterval(() => {
            currentOption = currentOption === treemapOption ? sunburstOption : treemapOption;
            this._chart.setOption(currentOption);
        }, 5000);

        return currentOption;
    }

    _generateRandomColor() {
        // Lista de cores base para garantir boa visibilidade
        const baseColors = [
            '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
            '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#c23531',
            '#2f4554', '#61a0a8', '#d48265', '#749f83', '#ca8622',
            '#bda29a', '#6e7074', '#546570', '#c4ccd3', '#f05b72'
        ];

        // Adiciona variação às cores base
        const color = baseColors[Math.floor(Math.random() * baseColors.length)];
        const variation = Math.random() * 40 - 20; // Variação de -20 a +20

        // Converte cor para RGB
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        // Aplica variação mantendo os valores entre 0 e 255
        const newR = Math.min(255, Math.max(0, r + variation));
        const newG = Math.min(255, Math.max(0, g + variation));
        const newB = Math.min(255, Math.max(0, b + variation));

        // Converte de volta para hexadecimal
        return '#' + 
            Math.round(newR).toString(16).padStart(2, '0') +
            Math.round(newG).toString(16).padStart(2, '0') +
            Math.round(newB).toString(16).padStart(2, '0');
    }

    _processDataForHierarchy(fields) {
        const hierarchy = {
            name: 'Metrics',
            children: []
        };

        // Group data by host
        const hostGroups = new Map();

        fields.forEach(field => {
            const parts = field.name.split('/');
            const hostName = field.host || 'Unknown Host';
            const value = parseFloat(field.value);

            if (!hostGroups.has(hostName)) {
                hostGroups.set(hostName, {
                    name: hostName,
                    children: []
                });
            }

            const hostGroup = hostGroups.get(hostName);
            hostGroup.children.push({
                name: parts[parts.length - 1],
                value: value
            });
        });

        // Add host groups to hierarchy
        hierarchy.children = Array.from(hostGroups.values());

        return hierarchy.children;
    }

    onResize() {
        super.onResize();

        if (this._state === WIDGET_STATE_ACTIVE) {
            this._resizeChart();
        }
    }

    _resizeChart() {
        if (this._chart) {
            this._chart.resize();
        }
    }

    // _isLiquidFillAvailable - Temporarily disabled
    // LiquidFill plugin availability check removed
    _isLiquidFillAvailable() {
        return false; // Always return false to disable liquidFill
    }

    _getResourceColor(value) {
        if (value >= 80) return '#ee6666';      // Vermelho para alto uso
        if (value >= 60) return '#fac858';      // Amarelo para médio uso
        return '#91cc75';                       // Verde para baixo uso
    }

    _getGraphHistory() {
        const history = [];
        const meta = this._items_meta;
        const data = this._items_data;



        if (!data || !meta) {
            console.error("Dados ou metadados ausentes");
            return history;
        }

        // Processando cada itemid presente nos dados
        for (const itemid in data) {
            if (!data.hasOwnProperty(itemid) || !meta.hasOwnProperty(itemid)) {
                continue;
            }

            // Obter informações do item atual
            const item_data = data[itemid];
            const item_meta = meta[itemid];
            


            // Obter o último valor nos dados do item
            let value = null;
            let clock = null;

            if (item_data.length > 0) {
                const last_point = item_data[item_data.length - 1];
                value = last_point.value;
                clock = last_point.clock;               
                
                // Verificar se o valor está em notação científica e convertê-lo
                if (typeof value === 'string' && value.match(/^\d+\.\d+e[+-]\d+/)) {
                    
                    // Extrair a parte numérica
                    const matches = value.match(/^(\d+\.\d+e[+-]\d+)/);
                    if (matches && matches[1]) {
                        const numVal = Number(matches[1]);
                        if (!isNaN(numVal)) {
                            value = numVal;
                        }
                    }
                }
            }

            // Adicionar o item ao histórico com suas informações
            if (value !== null && clock !== null) {
                history.push({
                    itemid: itemid,
                    name: item_meta.name,
                    units: item_meta.units || '',
                    color: item_meta.color || this._defaultColors(history.length),
                    value: value,
                    clock: clock
                });                
            }
        }

        // Ordenar o histórico pela ordem original dos itens
        history.sort((a, b) => {
            return meta[a.itemid].order - meta[b.itemid].order;
        });

        return history;
    }

    _prepareGraphData(history) {
        if (!history) {
            history = this._getGraphHistory();
        }       
        
        // Verifica se há dados para processar
        if (!history || history.length === 0) {
            console.warn("Sem dados para mostrar no gráfico");
            return [];
        }
        
        return history;
    }

    updateGraph() {
        
        try {
            // Limpar qualquer gráfico existente
            if (this._echart) {
                this._echart.dispose();
                this._echart = null;
            }
            
            // Obter o contêiner do gráfico
            const container = this.$('[data-container="graph"]')[0];
            if (!container) {
                console.error("Contêiner do gráfico não encontrado");
                return;
            }
            
            // Preparar os dados para o gráfico usando nosso novo método
            const history = this._getGraphHistory();
            // Verificar se há dados para o gráfico
            if (!history || history.length === 0) {
                console.warn("Sem dados para mostrar no gráfico");
                container.innerHTML = '<div class="no-data">Sem dados disponíveis</div>';
                return;
            }
            
            // Verificar o tipo de gráfico selecionado
            const chartType = parseInt(this._fields_values.chart_type) || 0;
            
            // Inicializar o gráfico conforme o tipo
            this._echart = echarts.init(container);
            
            // Criar o gráfico conforme o tipo selecionado
            switch (chartType) {
                case 0: // Linha
                    this._createLineChart(history);
                    break;
                case 1: // Barra
                    this._createBarChart(history);
                    break;
                case 2: // Torta
                    this._createPieChart(history);
                    break;
                case 3: // Gauge
                    this._createGaugeChart(history);
                    break;
                case 4: // Líquido
                    this._createLiquidChart(history);
                    break;
                default:
                    this._createLineChart(history);
            }
            
            // Redimensionar o gráfico se necessário
            window.addEventListener('resize', () => {
                if (this._echart) {
                    this._echart.resize();
                }
            });           
        } catch (error) {
            console.error("Erro ao atualizar o gráfico:", error);
        }
    }

    /**
     * Calculate statistics for series data
     * @param {Array} seriesData Array of [timestamp, value] pairs
     * @returns {Object} Statistics object with min, max, avg, last values
     */
    _calculateSeriesStats(seriesData) {
        if (!seriesData || seriesData.length === 0) {
            return { min: 0, max: 0, avg: 0, last: 0 };
        }

        const values = seriesData.map(point => point[1]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const last = values[values.length - 1];

        return { min, max, avg, last };
    }

    /**
     * Create enhanced legend with statistics in separate container
     * @param {Array} legendData Array of legend items with statistics
     */
    _createEnhancedLegend(legendData) {
        if (!legendData || legendData.length === 0) return;

        const isDarkTheme = document.body.classList.contains('dark-theme');
        const textColor = isDarkTheme ? '#ffffff' : '#000000';
        const backgroundColor = isDarkTheme ? 'rgba(25, 25, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        const borderColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        // Find legend container
        const legendContainer = this._chart_container.parentElement.querySelector('.chart-legend-container');
        if (!legendContainer) return;

        // Clear existing content
        legendContainer.innerHTML = '';
        
        // Check if this is a temporal chart
        const displayType = parseInt(this._fields_values.display_type);
        const isTemporalChart = displayType === WidgetEcharts.DISPLAY_TYPE_TEMPORAL_LINE || 
                              displayType === WidgetEcharts.DISPLAY_TYPE_TEMPORAL_AREA ||
                              displayType === WidgetEcharts.DISPLAY_TYPE_AREA_RAINFALL ||
                              displayType === WidgetEcharts.DISPLAY_TYPE_SCATTER_EFFECT;
        
        // Set container styles specifically for temporal charts
        if (isTemporalChart) {
            legendContainer.style.cssText = `
                padding: 8px 10px;
                background: ${backgroundColor};
                border-top: 1px solid ${borderColor};
                min-height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-wrap: nowrap;
                gap: 10px;
                margin-top: 230px;
                position: relative;
                z-index: 10;
                box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
            `;
        } else {
            legendContainer.style.cssText = `
                padding: 10px;
                background: ${backgroundColor};
                border-top: 1px solid ${borderColor};
                min-height: 45px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-wrap: wrap;
                gap: 12px;
                margin-top: 5px;
            `;
        }

        // Pagination settings for temporal charts
        const itemsPerPage = isTemporalChart ? Math.min(2, legendData.length) : Math.min(3, legendData.length);
        const totalPages = Math.ceil(legendData.length / itemsPerPage);
        let currentPage = 0;

        // Create items container
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'legend-items';
        
        if (isTemporalChart) {
            itemsContainer.style.cssText = `
                display: flex;
                gap: 8px;
                align-items: center;
                flex-wrap: nowrap;
                justify-content: center;
                flex: 1;
                overflow: hidden;
            `;
        } else {
            itemsContainer.style.cssText = `
                display: flex;
                gap: 12px;
                align-items: center;
                flex-wrap: wrap;
                justify-content: center;
                flex: 1;
            `;
        }

        // Function to update visible items
        const updateVisibleItems = () => {
            itemsContainer.innerHTML = '';
            
            const startIndex = currentPage * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, legendData.length);
            
            for (let i = startIndex; i < endIndex; i++) {
                const item = legendData[i];
                
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                
                if (isTemporalChart) {
                    legendItem.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        padding: 3px 6px;
                        border-radius: 3px;
                        transition: background-color 0.2s;
                        cursor: pointer;
                        border: 1px solid ${borderColor};
                        background: ${isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
                        flex-shrink: 0;
                        max-width: 200px;
                    `;
                } else {
                    legendItem.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        padding: 4px 8px;
                        border-radius: 4px;
                        transition: background-color 0.2s;
                        cursor: pointer;
                        border: 1px solid ${borderColor};
                        background: ${isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
                    `;
                }

                // Add hover effect
                legendItem.addEventListener('mouseenter', () => {
                    legendItem.style.backgroundColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                });
                legendItem.addEventListener('mouseleave', () => {
                    legendItem.style.backgroundColor = isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
                });

                // Color indicator
                const colorIndicator = document.createElement('div');
                colorIndicator.style.cssText = `
                    width: ${isTemporalChart ? '10px' : '12px'};
                    height: ${isTemporalChart ? '10px' : '12px'};
                    border-radius: ${isTemporalChart ? '1px' : '2px'};
                    background-color: ${item.color};
                    flex-shrink: 0;
                `;

                // Item info container
                const itemInfo = document.createElement('div');
                itemInfo.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                    flex: 1;
                    min-width: 0;
                `;

                // Item name
                const itemName = document.createElement('div');
                itemName.style.cssText = `
                    font-weight: 500;
                    color: ${textColor};
                    font-size: ${isTemporalChart ? '9px' : '11px'};
                    line-height: 1.2;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                `;
                itemName.textContent = isTemporalChart ? 
                    (item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name) :
                    (item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name);

                // Statistics
                const stats = document.createElement('div');
                if (isTemporalChart) {
                    stats.style.cssText = `
                        display: flex;
                        gap: 4px;
                        font-size: 8px;
                        color: ${isDarkTheme ? '#ccc' : '#666'};
                        line-height: 1.1;
                        white-space: nowrap;
                        overflow: hidden;
                    `;
                    stats.innerHTML = `
                        <span>L: ${item.stats.last}</span>
                        <span>Min: ${item.stats.min}</span>
                        <span>Max: ${item.stats.max}</span>
                        <span>Avg: ${item.stats.avg}</span>
                    `;
                } else {
                    stats.style.cssText = `
                        display: flex;
                        gap: 6px;
                        font-size: 10px;
                        color: ${isDarkTheme ? '#ccc' : '#666'};
                        line-height: 1.1;
                    `;
                    stats.innerHTML = `
                        <span>Last: ${item.stats.last}</span>
                        <span>Min: ${item.stats.min}</span>
                        <span>Max: ${item.stats.max}</span>
                        <span>Avg: ${item.stats.avg}</span>
                    `;
                }

                itemInfo.appendChild(itemName);
                itemInfo.appendChild(stats);

                legendItem.appendChild(colorIndicator);
                legendItem.appendChild(itemInfo);

                itemsContainer.appendChild(legendItem);
            }
        };

        // Create navigation container if needed
        if (totalPages > 1) {
            const navContainer = document.createElement('div');
            navContainer.style.cssText = `
                display: flex;
                align-items: center;
                gap: ${isTemporalChart ? '4px' : '8px'};
                flex-shrink: 0;
            `;

            const leftArrow = document.createElement('button');
            leftArrow.innerHTML = '◀';
            leftArrow.style.cssText = `
                background: ${backgroundColor};
                border: 1px solid ${borderColor};
                color: ${textColor};
                width: ${isTemporalChart ? '20px' : '28px'};
                height: ${isTemporalChart ? '20px' : '28px'};
                border-radius: 3px;
                cursor: pointer;
                font-size: ${isTemporalChart ? '10px' : '12px'};
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.2s;
                flex-shrink: 0;
            `;

            const rightArrow = document.createElement('button');
            rightArrow.innerHTML = '▶';
            rightArrow.style.cssText = leftArrow.style.cssText;

            const pageInfo = document.createElement('span');
            pageInfo.style.cssText = `
                font-size: ${isTemporalChart ? '8px' : '10px'};
                color: ${textColor};
                opacity: 0.7;
                flex-shrink: 0;
            `;

            // Add navigation functionality
            leftArrow.addEventListener('click', () => {
                if (currentPage > 0) {
                    currentPage--;
                    updateVisibleItems();
                    updateNavigation();
                }
            });

            rightArrow.addEventListener('click', () => {
                if (currentPage < totalPages - 1) {
                    currentPage++;
                    updateVisibleItems();
                    updateNavigation();
                }
            });

            const updateNavigation = () => {
                leftArrow.style.opacity = currentPage === 0 ? '0.3' : '1';
                rightArrow.style.opacity = currentPage === totalPages - 1 ? '0.3' : '1';
                pageInfo.textContent = `${currentPage + 1}/${totalPages}`;
            };

            navContainer.appendChild(leftArrow);
            navContainer.appendChild(pageInfo);
            navContainer.appendChild(rightArrow);

            legendContainer.appendChild(navContainer);
            legendContainer.appendChild(itemsContainer);

            updateNavigation();
        } else {
            legendContainer.appendChild(itemsContainer);
        }

        // Initialize with first page
        updateVisibleItems();
    }

    /**
     * Create temporal line chart
     * @param {Object} data Chart data
     * @returns {Object} ECharts options
     */
    _createTemporalLineChart(data) {
        if (!this._items_history || Object.keys(this._items_history).length === 0) {
            return {
                graphic: {
                    type: 'text',
                    left: 'center',
                    top: 'middle',
                    style: {
                        text: 'No historical data available',
                        fontSize: 14,
                        fill: '#999'
                    }
                }
            };
        }

        const series = [];
        const legend_data = [];
        const enhanced_legend_data = [];
        const showLegend = this._fields_values.show_legend === true || this._fields_values.show_legend === 1;
        const showGrid = this._fields_values.show_grid === true || this._fields_values.show_grid === 1;
        const smoothLines = this._fields_values.smooth_lines === true || this._fields_values.smooth_lines === 1;

        // Get distributed colors for all series
        const itemIds = Object.keys(this._items_history);
        const distributedColors = this._getDistributedColors(itemIds.length);

        // Process each item's historical data
        itemIds.forEach((itemid, index) => {
            const history = this._items_history[itemid];
            const meta = this._items_meta[itemid];
            
            if (!history || !history.length || !meta) return;

            const seriesData = history.map(point => [
                point.clock * 1000, // Convert to milliseconds for JavaScript Date
                parseFloat(point.value) || 0
            ]);

            // Calculate statistics
            const stats = this._calculateSeriesStats(seriesData);
            const units = meta.units || '';

            // Clean item name for better display
            let item_name = meta.name || `Item ${itemid}`;
            item_name = item_name.replace(/^Container\s*\/\s*/, ''); // Remove "Container /" prefix
            
            legend_data.push(item_name);

            // Prepare enhanced legend data
            enhanced_legend_data.push({
                name: item_name,
                color: distributedColors[index],
                stats: {
                    last: this._formatValueWithUnits(stats.last, units),
                    min: this._formatValueWithUnits(stats.min, units),
                    max: this._formatValueWithUnits(stats.max, units),
                    avg: this._formatValueWithUnits(stats.avg, units)
                }
            });

            series.push({
                name: item_name,
                type: 'line',
                data: seriesData,
                smooth: smoothLines,
                symbol: 'none', // Remove dots for cleaner look
                symbolSize: 3,
                lineStyle: {
                    width: 2,
                    color: distributedColors[index]
                },
                itemStyle: {
                    color: distributedColors[index]
                },
                emphasis: {
                    focus: 'series',
                    lineStyle: {
                        width: 3
                    }
                },
                animationDelay: index * 100
            });
        });

        const isDarkTheme = document.body.classList.contains('dark-theme');
        const textColor = isDarkTheme ? '#ffffff' : '#000000';
        const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    animation: false,
                    label: {
                        backgroundColor: 'rgba(50, 50, 50, 0.8)',
                        color: '#fff',
                        fontSize: 12
                    },
                    crossStyle: {
                        color: '#999',
                        width: 1,
                        type: 'dashed'
                    }
                },
                backgroundColor: 'rgba(50, 50, 50, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                textStyle: {
                    color: '#fff',
                    fontSize: 12
                },
                formatter: (params) => {
                    if (!params || !params.length) return '';
                    
                    const date = new Date(params[0].value[0]);
                    const time = date.toLocaleString([], {
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    let tooltip = `<div style="font-weight: bold; margin-bottom: 8px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">${time}</div>`;
                    
                    params.forEach(param => {
                        const itemIds = Object.keys(this._items_history);
                        const itemId = itemIds[param.seriesIndex];
                        const meta = this._items_meta[itemId];
                        const units = meta ? meta.units || '' : '';
                        
                        // Format value with proper units and scientific notation handling
                        let value = param.value[1];
                        let formattedValue;
                        
                        if (units && units.toLowerCase().includes('bps')) {
                            formattedValue = this._formatBitsValue(value);
                        } else if (units && units.toLowerCase() === '%') {
                            formattedValue = value.toFixed(2) + '%';
                        } else {
                            formattedValue = this._formatValueWithUnits(value, units);
                        }
                        
                        tooltip += `<div style="color: #fff; margin: 2px 0;">
                            <span style="display:inline-block;margin-right:8px;border-radius:50%;width:8px;height:8px;background-color:${param.color};"></span>
                            <span style="font-weight: 500;">${param.seriesName}:</span> <span style="float: right; margin-left: 10px;">${formattedValue}</span>
                        </div>`;
                    });
                    
                    return tooltip;
                }
            },
            legend: {
                show: false // Disable default legend as we'll use custom one
            },
            grid: {
                left: '3%',
                right: '3%',
                bottom: showLegend ? '35%' : '12%', // More space for enhanced legend and time labels
                top: '5%',
                containLabel: true
            },
            xAxis: {
                type: 'time',
                boundaryGap: false,
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: textColor,
                        width: 1
                    }
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 11,
                    formatter: (value) => {
                        const date = new Date(value);
                        const now = new Date();
                        const isToday = date.toDateString() === now.toDateString();
                        
                        if (isToday) {
                            return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        } else {
                            return date.toLocaleDateString([], {month: 'short', day: 'numeric'}) + '\n' + 
                                   date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        }
                    }
                },
                splitLine: {
                    show: showGrid,
                    lineStyle: {
                        color: gridColor,
                        type: 'dashed'
                    }
                }
            },
            yAxis: {
                type: 'value',
                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 11,
                    formatter: (value) => {
                        // Auto-format based on value size
                        if (Math.abs(value) >= 1000000000) {
                            return (value / 1000000000).toFixed(1) + 'G';
                        } else if (Math.abs(value) >= 1000000) {
                            return (value / 1000000).toFixed(1) + 'M';
                        } else if (Math.abs(value) >= 1000) {
                            return (value / 1000).toFixed(1) + 'K';
                        } else {
                            return value.toFixed(0);
                        }
                    }
                },
                splitLine: {
                    show: showGrid,
                    lineStyle: {
                        color: gridColor,
                        type: 'dashed'
                    }
                }
            },
            series: series,
            animation: true,
            animationDuration: 750,
            animationEasing: 'cubicOut',
            dataZoom: [
                {
                    type: 'inside',
                    start: 0,
                    end: 100
                }
            ]
        };

        // Add enhanced legend after chart is rendered
        if (showLegend && enhanced_legend_data.length > 0) {
            // Add temporal legend class for styling
            const container = this._chart_container.parentElement;
            if (container) {
                container.classList.add('temporal-legend-active');
            }
            
            setTimeout(() => {
                this._createEnhancedLegend(enhanced_legend_data);
            }, 100);
        }

        return options;
    }

    /**
     * Create temporal area chart
     * @param {Object} data Chart data
     * @returns {Object} ECharts options
     */
    _createTemporalAreaChart(data) {
        if (!this._items_history || Object.keys(this._items_history).length === 0) {
            return {
                graphic: {
                    type: 'text',
                    left: 'center',
                    top: 'middle',
                    style: {
                        text: 'No historical data available',
                        fontSize: 14,
                        fill: '#999'
                    }
                }
            };
        }

        const series = [];
        const legend_data = [];
        const enhanced_legend_data = [];
        const showLegend = this._fields_values.show_legend === true || this._fields_values.show_legend === 1;
        const showGrid = this._fields_values.show_grid === true || this._fields_values.show_grid === 1;
        const smoothLines = this._fields_values.smooth_lines === true || this._fields_values.smooth_lines === 1;

        // Get distributed colors for all series
        const itemIds = Object.keys(this._items_history);
        const distributedColors = this._getDistributedColors(itemIds.length);

        // Process each item's historical data
        itemIds.forEach((itemid, index) => {
            const history = this._items_history[itemid];
            const meta = this._items_meta[itemid];
            
            if (!history || !history.length || !meta) return;

            const seriesData = history.map(point => [
                point.clock * 1000, // Convert to milliseconds for JavaScript Date
                parseFloat(point.value) || 0
            ]);

            // Calculate statistics
            const stats = this._calculateSeriesStats(seriesData);
            const units = meta.units || '';

            // Clean item name for better display
            let item_name = meta.name || `Item ${itemid}`;
            item_name = item_name.replace(/^Container\s*\/\s*/, ''); // Remove "Container /" prefix
            
            legend_data.push(item_name);

            // Prepare enhanced legend data
            enhanced_legend_data.push({
                name: item_name,
                color: distributedColors[index],
                stats: {
                    last: this._formatValueWithUnits(stats.last, units),
                    min: this._formatValueWithUnits(stats.min, units),
                    max: this._formatValueWithUnits(stats.max, units),
                    avg: this._formatValueWithUnits(stats.avg, units)
                }
            });

            const color = distributedColors[index];

            series.push({
                name: item_name,
                type: 'line',
                data: seriesData,
                smooth: smoothLines,
                symbol: 'circle',
                symbolSize: 0, // Hide symbols by default
                lineStyle: {
                    width: 2,
                    color: color
                },
                itemStyle: {
                    color: color
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: color + '80' // 50% opacity at top
                            },
                            {
                                offset: 1,
                                color: color + '10' // 6% opacity at bottom
                            }
                        ]
                    }
                },
                emphasis: {
                    focus: 'series',
                    lineStyle: {
                        width: 3
                    },
                    symbolSize: 4
                },
                animationDelay: index * 100
            });
        });

        const isDarkTheme = document.body.classList.contains('dark-theme');
        const textColor = isDarkTheme ? '#ffffff' : '#000000';
        const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    animation: false,
                    label: {
                        backgroundColor: 'rgba(50, 50, 50, 0.8)',
                        color: '#fff',
                        fontSize: 12
                    },
                    crossStyle: {
                        color: '#999',
                        width: 1,
                        type: 'dashed'
                    }
                },
                backgroundColor: 'rgba(50, 50, 50, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                textStyle: {
                    color: '#fff',
                    fontSize: 12
                },
                formatter: (params) => {
                    if (!params || !params.length) return '';
                    
                    const date = new Date(params[0].value[0]);
                    const time = date.toLocaleString([], {
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    let tooltip = `<div style="font-weight: bold; margin-bottom: 8px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">${time}</div>`;
                    
                    params.forEach(param => {
                        const itemIds = Object.keys(this._items_history);
                        const itemId = itemIds[param.seriesIndex];
                        const meta = this._items_meta[itemId];
                        const units = meta ? meta.units || '' : '';
                        
                        // Format value with proper units and scientific notation handling
                        let value = param.value[1];
                        let formattedValue;
                        
                        if (units && units.toLowerCase().includes('bps')) {
                            formattedValue = this._formatBitsValue(value);
                        } else if (units && units.toLowerCase() === '%') {
                            formattedValue = value.toFixed(2) + '%';
                        } else {
                            formattedValue = this._formatValueWithUnits(value, units);
                        }
                        
                        tooltip += `<div style="color: #fff; margin: 2px 0;">
                            <span style="display:inline-block;margin-right:8px;border-radius:50%;width:8px;height:8px;background-color:${param.color};"></span>
                            <span style="font-weight: 500;">${param.seriesName}:</span> <span style="float: right; margin-left: 10px;">${formattedValue}</span>
                        </div>`;
                    });
                    
                    return tooltip;
                }
            },
            legend: {
                show: false // Disable default legend as we'll use custom one
            },
            grid: {
                left: '3%',
                right: '3%',
                bottom: showLegend ? '35%' : '12%', // More space for enhanced legend and time labels
                top: '5%',
                containLabel: true
            },
            xAxis: {
                type: 'time',
                boundaryGap: false,
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: textColor,
                        width: 1
                    }
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 11,
                    formatter: (value) => {
                        const date = new Date(value);
                        const now = new Date();
                        const isToday = date.toDateString() === now.toDateString();
                        
                        if (isToday) {
                            return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        } else {
                            return date.toLocaleDateString([], {month: 'short', day: 'numeric'}) + '\n' + 
                                   date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        }
                    }
                },
                splitLine: {
                    show: showGrid,
                    lineStyle: {
                        color: gridColor,
                        type: 'dashed'
                    }
                }
            },
            yAxis: {
                type: 'value',
                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 11,
                    formatter: (value) => {
                        // Auto-format based on value size
                        if (Math.abs(value) >= 1000000000) {
                            return (value / 1000000000).toFixed(1) + 'G';
                        } else if (Math.abs(value) >= 1000000) {
                            return (value / 1000000).toFixed(1) + 'M';
                        } else if (Math.abs(value) >= 1000) {
                            return (value / 1000).toFixed(1) + 'K';
                        } else {
                            return value.toFixed(0);
                        }
                    }
                },
                splitLine: {
                    show: showGrid,
                    lineStyle: {
                        color: gridColor,
                        type: 'dashed'
                    }
                }
            },
            series: series,
            animation: true,
            animationDuration: 750,
            animationEasing: 'cubicOut',
            dataZoom: [
                {
                    type: 'inside',
                    start: 0,
                    end: 100
                }
            ]
        };

        // Add enhanced legend after chart is rendered
        if (showLegend && enhanced_legend_data.length > 0) {
            // Add temporal legend class for styling
            const container = this._chart_container.parentElement;
            if (container) {
                container.classList.add('temporal-legend-active');
            }
            
            setTimeout(() => {
                this._createEnhancedLegend(enhanced_legend_data);
            }, 100);
        }

        return options;
    }

    /**
     * Create area rainfall chart
     * @param {Object} data Chart data
     * @returns {Object} ECharts options
     */
    _createAreaRainfallChart(data) {
        if (!this._items_history || Object.keys(this._items_history).length === 0) {
            return {
                graphic: {
                    type: 'text',
                    left: 'center',
                    top: 'middle',
                    style: {
                        text: 'No historical data available',
                        fontSize: 14,
                        fill: '#999'
                    }
                }
            };
        }

        const series = [];
        const enhanced_legend_data = [];
        const showLegend = this._fields_values.show_legend === true || this._fields_values.show_legend === 1;
        const showGrid = this._fields_values.show_grid === true || this._fields_values.show_grid === 1;

        // Get distributed colors for all series
        const itemIds = Object.keys(this._items_history);
        const distributedColors = this._getDistributedColors(itemIds.length);

        // Process each item's historical data
        itemIds.forEach((itemid, index) => {
            const history = this._items_history[itemid];
            const meta = this._items_meta[itemid];
            
            if (!history || !history.length || !meta) return;

            const seriesData = history.map(point => [
                point.clock * 1000, // Convert to milliseconds for JavaScript Date
                parseFloat(point.value) || 0
            ]);

            // Calculate statistics
            const stats = this._calculateSeriesStats(seriesData);
            const units = meta.units || '';

            // Clean item name for better display
            let item_name = meta.name || `Item ${itemid}`;
            item_name = item_name.replace(/^Container\s*\/\s*/, ''); // Remove "Container /" prefix

            // Prepare enhanced legend data
            enhanced_legend_data.push({
                name: item_name,
                color: distributedColors[index],
                stats: {
                    last: this._formatValueWithUnits(stats.last, units),
                    min: this._formatValueWithUnits(stats.min, units),
                    max: this._formatValueWithUnits(stats.max, units),
                    avg: this._formatValueWithUnits(stats.avg, units)
                }
            });

            const color = distributedColors[index];

            series.push({
                name: item_name,
                type: 'line',
                data: seriesData,
                stack: 'total',
                smooth: true,
                lineStyle: {
                    width: 0
                },
                showSymbol: false,
                areaStyle: {
                    opacity: 0.8,
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: color + 'FF'
                            },
                            {
                                offset: 1,
                                color: color + '80'
                            }
                        ]
                    }
                },
                emphasis: {
                    focus: 'series'
                },
                animationDelay: index * 100
            });
        });

        const isDarkTheme = document.body.classList.contains('dark-theme');
        const textColor = isDarkTheme ? '#ffffff' : '#000000';
        const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    animation: false,
                    label: {
                        backgroundColor: 'rgba(50, 50, 50, 0.8)',
                        color: '#fff',
                        fontSize: 12
                    },
                    crossStyle: {
                        color: '#999',
                        width: 1,
                        type: 'dashed'
                    }
                },
                backgroundColor: 'rgba(50, 50, 50, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                textStyle: {
                    color: '#fff',
                    fontSize: 12
                },
                formatter: (params) => {
                    if (!params || !params.length) return '';
                    
                    const date = new Date(params[0].value[0]);
                    const time = date.toLocaleString([], {
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    let tooltip = `<div style="font-weight: bold; margin-bottom: 8px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">${time}</div>`;
                    
                    params.forEach(param => {
                        const itemIds = Object.keys(this._items_history);
                        const itemId = itemIds[param.seriesIndex];
                        const meta = this._items_meta[itemId];
                        const units = meta ? meta.units || '' : '';
                        
                        // Format value with proper units and scientific notation handling
                        let value = param.value[1];
                        let formattedValue;
                        
                        if (units && units.toLowerCase().includes('bps')) {
                            formattedValue = this._formatBitsValue(value);
                        } else if (units && units.toLowerCase() === '%') {
                            formattedValue = value.toFixed(2) + '%';
                        } else {
                            formattedValue = this._formatValueWithUnits(value, units);
                        }
                        
                        tooltip += `<div style="color: #fff; margin: 2px 0;">
                            <span style="display:inline-block;margin-right:8px;border-radius:50%;width:8px;height:8px;background-color:${param.color};"></span>
                            <span style="font-weight: 500;">${param.seriesName}:</span> <span style="float: right; margin-left: 10px;">${formattedValue}</span>
                        </div>`;
                    });
                    
                    return tooltip;
                }
            },
            legend: {
                show: false
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: showLegend ? '35%' : '12%', // More space for enhanced legend and time labels
                top: '5%',
                containLabel: true
            },
            xAxis: {
                type: 'time',
                boundaryGap: false,
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: textColor,
                        width: 1
                    }
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 11,
                    formatter: (value) => {
                        const date = new Date(value);
                        const now = new Date();
                        const isToday = date.toDateString() === now.toDateString();
                        
                        if (isToday) {
                            return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        } else {
                            return date.toLocaleDateString([], {month: 'short', day: 'numeric'}) + '\n' + 
                                   date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        }
                    }
                },
                splitLine: {
                    show: showGrid,
                    lineStyle: {
                        color: gridColor,
                        type: 'dashed'
                    }
                }
            },
            yAxis: {
                type: 'value',
                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 11,
                    formatter: (value) => {
                        // Auto-format based on value size
                        if (Math.abs(value) >= 1000000000) {
                            return (value / 1000000000).toFixed(1) + 'G';
                        } else if (Math.abs(value) >= 1000000) {
                            return (value / 1000000).toFixed(1) + 'M';
                        } else if (Math.abs(value) >= 1000) {
                            return (value / 1000).toFixed(1) + 'K';
                        } else {
                            return value.toFixed(0);
                        }
                    }
                },
                splitLine: {
                    show: showGrid,
                    lineStyle: {
                        color: gridColor,
                        type: 'dashed'
                    }
                }
            },
            series: series,
            animation: true,
            animationDuration: 1000,
            animationEasing: 'cubicInOut'
        };

        // Add enhanced legend after chart is rendered
        if (showLegend && enhanced_legend_data.length > 0) {
            // Add temporal legend class for styling
            const container = this._chart_container.parentElement;
            if (container) {
                container.classList.add('temporal-legend-active');
            }
            
            setTimeout(() => {
                this._createEnhancedLegend(enhanced_legend_data);
            }, 100);
        }

        return options;
    }

    /**
     * Create scatter effect chart
     * @param {Object} data Chart data
     * @returns {Object} ECharts options
     */
    _createScatterEffectChart(data) {
        const fields = data.fields;
        if (!fields || !fields.length) return null;

        const enhanced_legend_data = [];
        const showLegend = this._fields_values.show_legend === true || this._fields_values.show_legend === 1;
        const showGrid = this._fields_values.show_grid === true || this._fields_values.show_grid === 1;

        // Get distributed colors for all series
        const distributedColors = this._getDistributedColors(fields.length);

        // Calculate min and max values to determine which points should have effects
        const values = fields.map(field => parseFloat(field.value));
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        
        // Get unique values and find which indices should have effects
        const uniqueValues = [...new Set(values)];
        const hasMultipleDistinctValues = uniqueValues.length > 1;
        
        // Find the first index of min and max values to avoid multiple effects on same values
        const minValueFirstIndex = values.indexOf(minValue);
        const maxValueFirstIndex = values.indexOf(maxValue);

        // Prepare scatter data using current values only (not temporal)
        const scatterData = fields.map((field, index) => {
            const value = parseFloat(field.value);
            const currentTime = Date.now();
            
            // Check if this is min or max value
            const isMinValue = value === minValue;
            const isMaxValue = value === maxValue;
            
            // Only the FIRST occurrence of min/max values should have effect to avoid duplicates
            let shouldHaveEffect = false;
            
            if (hasMultipleDistinctValues) {
                // If we have different values, only first min and first max should pulse
                shouldHaveEffect = (index === minValueFirstIndex) || (index === maxValueFirstIndex);
            } else {
                // If all values are the same, no pulsing effect
                shouldHaveEffect = false;
            }
            

            
            // Prepare enhanced legend data with current values
            enhanced_legend_data.push({
                name: field.name,
                color: distributedColors[index],
                stats: {
                    last: this._formatValueWithUnits(value, field.units),
                    min: this._formatValueWithUnits(value, field.units),
                    max: this._formatValueWithUnits(value, field.units),
                    avg: this._formatValueWithUnits(value, field.units)
                }
            });

            return {
                name: field.name,
                host: field.host,
                value: [index, value], // [x position, y value] - simple x,y positioning
                symbolSize: Math.max(20, Math.min(60, Math.abs(value) / 2)),
                isMinValue: isMinValue,
                isMaxValue: isMaxValue,
                shouldHaveEffect: shouldHaveEffect,
                itemStyle: {
                    color: distributedColors[index],
                    shadowBlur: shouldHaveEffect ? 15 : 5,
                    shadowColor: distributedColors[index]
                }
            };
        });

        // Separate data into effect and normal scatter points
        // Effect points: only first occurrence of min AND max values
        const effectScatterData = scatterData.filter(item => item.shouldHaveEffect);
        
        // Normal points: all other values  
        const normalScatterData = scatterData.filter(item => !item.shouldHaveEffect);
        


        const isDarkTheme = document.body.classList.contains('dark-theme');
        const textColor = isDarkTheme ? '#ffffff' : '#000000';
        const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        const series = [];

        // Add normal scatter points (without effect)
        if (normalScatterData.length > 0) {
            series.push({
                name: 'Normal Metrics',
                data: normalScatterData,
                type: 'scatter',
                symbolSize: function (data) {
                    return Math.max(20, Math.min(60, Math.abs(data[1]) / 2));
                },
                emphasis: {
                    scale: 1.3
                },
                animationDelay: function (idx) {
                    return idx * 50;
                }
            });
        }

        // Add effect scatter points (only min and max values)
        if (effectScatterData.length > 0) {
            series.push({
                name: 'Min/Max Metrics',
                data: effectScatterData,
                type: 'effectScatter',
                symbolSize: function (data) {
                    return Math.max(25, Math.min(70, Math.abs(data[1]) / 2));
                },
                showEffectOn: 'render',
                rippleEffect: {
                    brushType: 'stroke',
                    scale: 3.0,  // Increased scale for more visible effect
                    period: 2.5  // Faster pulsing
                },
                itemStyle: {
                    shadowBlur: 20,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0
                },
                emphasis: {
                    scale: 1.8,  // Bigger emphasis
                    itemStyle: {
                        shadowBlur: 25
                    }
                },
                animationDelay: function (idx) {
                    return idx * 150 + 300;
                },
                animationDuration: 1500
            });
        }

        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(50, 50, 50, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                textStyle: {
                    color: '#fff',
                    fontSize: 12
                },
                formatter: (params) => {
                    const field = fields.find(f => f.name === params.data.name);
                    if (field) {
                        const value = params.data.value[1];
                        const isMinValue = params.data.isMinValue;
                        const isMaxValue = params.data.isMaxValue;
                        
                        let badge = '';
                        if (params.data.shouldHaveEffect) {
                            if (isMinValue && isMaxValue && minValue === maxValue) {
                                // Same item is both min and max (only one unique value across all data)
                                badge = '<span style="color: #ffd43b; font-weight: bold;">[ONLY VALUE]</span>';
                            } else if (isMinValue && isMaxValue) {
                                // This specific item has a value that is both min and max
                                badge = '<span style="color: #ff6b6b; font-weight: bold;">[MIN]</span> <span style="color: #51cf66; font-weight: bold;">[MAX]</span>';
                            } else if (isMinValue) {
                                badge = '<span style="color: #ff6b6b; font-weight: bold;">[MIN]</span>';
                            } else if (isMaxValue) {
                                badge = '<span style="color: #51cf66; font-weight: bold;">[MAX]</span>';
                            }
                        }
                        
                        return `<div style="font-weight: bold; margin-bottom: 4px;">${params.data.name} ${badge}</div>` +
                               `<div style="margin-bottom: 2px;"><strong>Host:</strong> ${params.data.host || 'Unknown'}</div>` +
                               `<div><strong>Value:</strong> ${this._formatValueWithUnits(value, field.units)}</div>`;
                    }
                    return `<div style="font-weight: bold;">${params.data.name}</div>` +
                           `<div><strong>Host:</strong> ${params.data.host || 'Unknown'}</div>` +
                           `<div><strong>Value:</strong> ${params.data.value[1]}</div>`;
                }
            },
            legend: {
                show: false
            },
            grid: {
                left: '3%',
                right: '7%',
                bottom: showLegend ? '35%' : '12%', // More space for enhanced legend and time labels
                top: '5%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: fields.map(field => field.name.length > 10 ? field.name.substring(0, 10) + '...' : field.name),
                axisLine: {
                    lineStyle: {
                        color: textColor
                    }
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 10,
                    rotate: 45
                },
                splitLine: {
                    show: showGrid,
                    lineStyle: {
                        color: gridColor,
                        type: 'dashed'
                    }
                }
            },
            yAxis: {
                type: 'value',
                axisLine: {
                    lineStyle: {
                        color: textColor
                    }
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 11,
                    formatter: (value) => {
                        // Auto-format based on value size
                        if (Math.abs(value) >= 1000000000) {
                            return (value / 1000000000).toFixed(1) + 'G';
                        } else if (Math.abs(value) >= 1000000) {
                            return (value / 1000000).toFixed(1) + 'M';
                        } else if (Math.abs(value) >= 1000) {
                            return (value / 1000).toFixed(1) + 'K';
                        } else {
                            return value.toFixed(0);
                        }
                    }
                },
                splitLine: {
                    show: showGrid,
                    lineStyle: {
                        color: gridColor,
                        type: 'dashed'
                    }
                }
            },
            series: series,
            animation: true,
            animationDuration: 1000,
            animationEasing: 'elasticOut'
        };

        // Add enhanced legend after chart is rendered
        if (showLegend && enhanced_legend_data.length > 0) {
            // Add temporal legend class for styling
            const container = this._chart_container.parentElement;
            if (container) {
                container.classList.add('temporal-legend-active');
            }
            
            setTimeout(() => {
                this._createEnhancedLegend(enhanced_legend_data);
            }, 100);
        }

        return options;
    }
}