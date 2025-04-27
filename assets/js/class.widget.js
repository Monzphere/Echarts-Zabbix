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

    // Constants for trigger severity
    static TRIGGER_SEVERITY_COLORS = {
        0: '#97AAB3', // Not classified
        1: '#7499FF', // Information
        2: '#FFC859', // Warning
        3: '#FFA059', // Average
        4: '#E97659', // High
        5: '#E45959'  // Disaster
    };

    // Adicionar após as constantes estáticas
    static DEFAULT_COLORS = [
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
    ];

    onInitialize() {
        super.onInitialize();

        this._refresh_frame = null;
        this._chart_container = null;
        this._chart = null;
        this._items_data = {};
        this._items_meta = {};
        this._fields_values = {
            display_type: 0,
            unit_type: 0,
            echarts_config: null,
            config_type: 0
        };
    }

    processUpdateResponse(response) {
        // Update internal data
        this._items_data = response.items_data || {};
        this._items_meta = response.items_meta || {};
        this._fields_values = response.fields_values || this._fields_values;

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
                items_meta: {...this._items_meta}
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
                    console.log('Click on graph:', params);
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
                    options = this._createLiquidChart(data);
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
            
            // Atualiza o gráfico com as novas opções
            this._chart.setOption(finalOptions, true);
            
            // Reregistra os eventos necessários
            this._chart.on('click', (params) => {
                console.log('Click on graph:', params);
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
        return WidgetEcharts.DEFAULT_COLORS[index % WidgetEcharts.DEFAULT_COLORS.length];
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

            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                return 'N/A';
            }

            // Se não houver unidades definidas, retorna apenas o valor formatado
            if (!units) {
                return numValue.toFixed(2);
            }

            // Se a unidade for B, KB, MB, GB, TB ou variações, formata como bytes
            if (/^[KMGT]?B$/i.test(units)) {
                const sizeUnits = ['B', 'KB', 'MB', 'GB', 'TB'];
                let unitIndex = sizeUnits.indexOf(units.toUpperCase());
                if (unitIndex === -1) unitIndex = 0;
                
                let formattedValue = numValue * Math.pow(1024, unitIndex);
                unitIndex = 0;
                
                while (formattedValue >= 1024 && unitIndex < sizeUnits.length - 1) {
                    formattedValue /= 1024;
                    unitIndex++;
                }
                
                return formattedValue.toFixed(2) + ' ' + sizeUnits[unitIndex];
            }

            // Se a unidade terminar com /s, formata com as unidades apropriadas
            if (units.endsWith('/s')) {
                const baseUnit = units.slice(0, -2);
                const sizeUnits = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
                let unitIndex = 0;
                let formattedValue = numValue;
                
                while (formattedValue >= 1024 && unitIndex < sizeUnits.length - 1) {
                    formattedValue /= 1024;
                    unitIndex++;
                }
                
                return formattedValue.toFixed(2) + ' ' + sizeUnits[unitIndex];
            }

            // Se a unidade for %, mantém como percentual
            if (units === '%') {
                return numValue.toFixed(2) + '%';
            }

            // Para valores muito grandes ou muito pequenos, usa notação científica
            if (Math.abs(numValue) >= 1000000 || Math.abs(numValue) <= 0.01) {
                return numValue.toExponential(2) + ' ' + units;
            }

            // Para outros casos, mantém o número com 2 casas decimais e a unidade original
            return numValue.toFixed(2) + ' ' + units;

        } catch (error) {
            console.error('Error formatting value:', error);
            return numValue.toFixed(2); // Retorna o valor formatado sem unidades em caso de erro
        }
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
                        width: 3,
                        color: [
                            [0.3, '#91cc75'],  // 0-30% verde
                            [0.7, '#fac858'],  // 30-70% amarelo
                            [1, '#ee6666']     // 70-100% vermelho
                        ]
                    }
                },
                pointer: {
                    icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
                    length: '45%',
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
                    distance: -16,
                    fontSize: 8,
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
                    offsetCenter: [0, '30%'],
                    fontSize: 10,
                    color: '#999'
                },
                detail: {
                    valueAnimation: true,
                    fontSize: 16,
                    offsetCenter: [0, '8%'],
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

    _createLiquidChart(data) {
        if (!data.fields || !data.fields.length) {
            return null;
        }

        const field = data.fields[0];
        const value = parseFloat(field.value);
        
        if (isNaN(value)) {
            return null;
        }

        // Calcula o valor percentual se necessário
        let displayValue = value;
        let formattedValue = this._formatValueWithUnits(value, field.units);

        return {
            tooltip: {
                formatter: () => {
                    return `${field.name}: ${formattedValue}`;
                }
            },
            series: [{
                type: 'liquidFill',
                data: [{
                    value: displayValue / 100,
                    itemStyle: {
                        color: this._getColorByValue(displayValue, 0, 100)
                    }
                }],
                radius: '90%',
                center: ['50%', '50%'],
                outline: {
                    show: true,
                    borderDistance: 5,
                    itemStyle: {
                        borderColor: '#294D99',
                        borderWidth: 2
                    }
                },
                label: {
                    formatter: () => formattedValue,
                    fontSize: 30,
                    color: '#fff'
                },
                backgroundStyle: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                itemStyle: {
                    opacity: 0.95,
                    shadowBlur: 50,
                    shadowColor: 'rgba(0, 0, 0, 0.4)'
                },
                emphasis: {
                    itemStyle: {
                        opacity: 0.8
                    }
                }
            }]
        };
    }

    _createPieChart(data) {
        const field = data.fields[0];
        if (!field) return null;

        const value = parseFloat(field.value);
        if (isNaN(value)) return null;

        const remaining = 100 - value;
        
        return {
            tooltip: {
                trigger: 'item'
            },
            series: [{
                name: field.name,
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
                    formatter: function(params) {
                        return params.value.toFixed(2) + field.units;
                    }
                },
                data: [
                    { value: value, name: field.name },
                    { value: remaining, name: 'Remaining' }
                ]
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

        // Preparar dados para o gráfico
        const chartData = items.map((item, index) => ({
            value: Math.abs(parseFloat(item.value)),
            name: item.name,
            itemStyle: {
                color: this._getColorByIndex(index)
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

                    let value = this._formatValue(params.value);
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

                        let value = this._formatValue(params.value);
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
        console.log('Iniciando criação da tabela LLD', {
            data: data,
            container: this._chart_container,
            fields_values: this._fields_values
        });

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

                // Se a unidade for B, KB, MB, GB, TB ou variações, formata como bytes
                if (/^[KMGT]?B$/i.test(units)) {
                    const sizeUnits = ['B', 'KB', 'MB', 'GB', 'TB'];
                    let unitIndex = sizeUnits.indexOf(units.toUpperCase());
                    if (unitIndex === -1) unitIndex = 0;
                    
                    let formattedValue = numValue * Math.pow(1024, unitIndex);
                    unitIndex = 0;
                    
                    while (formattedValue >= 1024 && unitIndex < sizeUnits.length - 1) {
                        formattedValue /= 1024;
                        unitIndex++;
                    }
                    
                    return formattedValue.toFixed(2) + ' ' + sizeUnits[unitIndex];
                }
                // Se a unidade terminar com /s, formata com as unidades apropriadas
                else if (units.endsWith('/s')) {
                    const baseUnit = units.slice(0, -2);
                    const sizeUnits = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
                    let unitIndex = 0;
                    let formattedValue = numValue;
                    
                    while (formattedValue >= 1024 && unitIndex < sizeUnits.length - 1) {
                        formattedValue /= 1024;
                        unitIndex++;
                    }
                    
                    return formattedValue.toFixed(2) + ' ' + sizeUnits[unitIndex];
                }
                // Se a unidade for %, mantém como percentual
                else if (units === '%') {
                    return numValue.toFixed(2) + '%';
                }
                // Para valores muito grandes ou muito pequenos, usa notação científica
                else if (Math.abs(numValue) >= 1000000 || Math.abs(numValue) <= 0.01) {
                    return numValue.toExponential(2) + (units ? ' ' + units : '');
                }
                // Para outros casos, mantém o número com 2 casas decimais e a unidade original
                else {
                    return numValue.toFixed(2) + (units ? ' ' + units : '');
                }
            } catch (error) {
                console.error('Error formatting value:', error);
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
        if (!data.fields || !data.fields.length) {
            return null;
        }

        // Prepare data for funnel chart
        const chartData = data.fields.map(field => ({
            value: parseFloat(field.value),
            name: field.name
        }))
        .filter(item => !isNaN(item.value))
        .sort((a, b) => b.value - a.value); // Sort descending by value

        return {
            tooltip: {
                trigger: 'item',
                formatter: (params) => {
                    const value = this._formatValue(params.value);
                    return `${params.seriesName}<br/>${params.name}: ${value}`;
                }
            },
            toolbox: {
                feature: {
                    dataView: { 
                        readOnly: false,
                        title: 'Data View'
                    },
                    restore: {
                        title: 'Restore'
                    },
                    saveAsImage: {
                        title: 'Save Image'
                    }
                },
                right: '5%',
                top: '5%'
            },
            series: [{
                name: 'Metrics',
                type: 'funnel',
                left: '10%',
                right: '10%',
                top: '10%',
                bottom: '10%',
                width: '80%',
                min: 0,
                max: Math.max(...chartData.map(item => item.value)),
                minSize: '0%',
                maxSize: '100%',
                sort: 'descending',
                gap: 2,
                label: {
                    show: true,
                    position: 'inside',
                    formatter: (params) => {
                        const value = this._formatValue(params.value);
                        return `${params.name}\n${value}`;
                    },
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#fff'
                },
                labelLine: {
                    length: 10,
                    lineStyle: {
                        width: 1,
                        type: 'solid'
                    }
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 1
                },
                emphasis: {
                    label: {
                        fontSize: 16,
                        fontWeight: 'bold'
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
                        return params.name + '\n' + this._formatValue(params.value);
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
                            return this._formatValue(params.value);
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

    _formatValue(value) {
        if (value === null || value === undefined) {
            return 'N/A';
        }

        try {
            const unitType = parseInt(this._fields_values.unit_type) || WidgetEcharts.UNIT_TYPE_NONE;
            const numValue = parseFloat(value);
            
            if (isNaN(numValue)) {
                return 'N/A';
            }
            
            switch (unitType) {
                case WidgetEcharts.UNIT_TYPE_PERCENTAGE:
                    return numValue.toFixed(2) + '%';
                case WidgetEcharts.UNIT_TYPE_BITS:
                    const units = ['b', 'Kb', 'Mb', 'Gb', 'Tb'];
                    let unitIndex = 0;
                    let formattedValue = Math.abs(numValue);
                    
                    while (formattedValue >= 1024 && unitIndex < units.length - 1) {
                        formattedValue /= 1024;
                        unitIndex++;
                    }
                    
                    return formattedValue.toFixed(2) + ' ' + units[unitIndex];
                default:
                    return numValue.toFixed(2);
            }
        } catch (error) {
            console.error('Error in _formatValue:', error);
            return 'Error';
        }
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

    _getResourceColor(value) {
        if (value >= 80) return '#ee6666';      // Vermelho para alto uso
        if (value >= 60) return '#fac858';      // Amarelo para médio uso
        return '#91cc75';                       // Verde para baixo uso
    }
}