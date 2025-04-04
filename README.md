# ECharts Widget for Zabbix - [Monzphere](https://monzphere.com)

This module adds a customizable widget to Zabbix that allows creating interactive charts using the ECharts library.

## 🚀 Features

- Support for multiple chart types
- Configuration via JSON or JavaScript
- Complete customization of colors, styles, and animations
- Real-time updates
- Light/Dark theme support

## 📊 Chart Examples

### Gauge (Basic)
![image](https://github.com/user-attachments/assets/1456485b-bb2c-4021-b7cd-2becb25b8842)

```javascript
const field = context.panel.data.series[0].fields[0];
return {
    series: [{
        type: 'gauge',
        radius: '100%',
        progress: {
            show: true,
            width: 18
        },
        axisLine: {
            lineStyle: {
                width: 18,
                color: [
                    [0.2, '#91cc75'],  // Green up to 20%
                    [0.8, '#fac858'],  // Yellow up to 80%
                    [1, '#ee6666']     // Red up to 100%
                ]
            }
        },
        axisTick: { show: false },
        splitLine: {
            length: 12,
            lineStyle: { width: 2, color: '#999' }
        },
        pointer: { show: true },
        title: {
            show: true,
            fontSize: 14
        },
        detail: {
            valueAnimation: true,
            fontSize: 30,
            offsetCenter: [0, '70%'],
            formatter: function(value) {
                return value.toFixed(2) + field.units;
            }
        },
        data: [{
            value: field.value,
            name: field.name
        }]
    }]
};
```

### Liquid Chart

![image](https://github.com/user-attachments/assets/581a5898-654b-4911-a50b-74c615ffe66e)


```javacript
// Verifica se temos dados
if (!context.panel.data.series || !context.panel.data.series[0] || !context.panel.data.series[0].fields) {
    console.error('Dados não disponíveis no formato esperado');
    return {};
}

const field = context.panel.data.series[0].fields[0];

// Log para debug
console.log('Campo selecionado:', {
    nome: field.name,
    valor: field.value,
    unidade: field.units
});

return {
    backgroundColor: 'transparent',
    series: [{
        type: 'liquidFill',
        data: [field.value / 100],
        radius: '80%',
        color: ['#91cc75'],
        backgroundStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
        },
        label: {
            formatter: function() {
                return field.name + '\n' + field.value.toFixed(2) + field.units;
            },
            fontSize: 28,
            color: 'black'
        },
        outline: {
            show: false
        }
    }]
};
```

### Multi-Level Gauge

```javascript
// Note: For long configurations, you might need to put the code in a single line
const fields=context.panel.data.series[0].fields,value=fields[0].value,atual=value,desejado=value<=70?Math.max(0,value-atual):30,naodesejado=Math.max(0,100-atual-desejado),gaugeData=[{value:atual,name:'Current',title:{offsetCenter:['0%','-30%'],color:'#5470c6'},detail:{valueAnimation:true,offsetCenter:['0%','-20%'],formatter:'{value}%',color:'#5470c6',backgroundColor:'#fff',borderRadius:10,padding:[5,10]},itemStyle:{color:'#5470c6'}},{value:desejado,name:'Desired',title:{offsetCenter:['0%','0%'],color:'#91cc75'},detail:{valueAnimation:true,offsetCenter:['0%','10%'],formatter:'{value}%',color:'#91cc75',backgroundColor:'#fff',borderRadius:10,padding:[5,10]},itemStyle:{color:'#91cc75'}},{value:naodesejado,name:'Undesired',title:{offsetCenter:['0%','30%'],color:'#fac858'},detail:{valueAnimation:true,offsetCenter:['0%','40%'],formatter:'{value}%',color:'#fac858',backgroundColor:'#fff',borderRadius:10,padding:[5,10]},itemStyle:{color:'#fac858'}}];return{backgroundColor:'transparent',series:[{type:'gauge',startAngle:90,endAngle:-270,center:['50%','50%'],radius:'90%',pointer:{show:false},progress:{show:true,overlap:false,roundCap:true,clip:false,itemStyle:{borderWidth:0}},axisLine:{lineStyle:{width:20,color:[[1,'rgba(255,255,255,0.1)']]}},splitLine:{show:false},axisTick:{show:false},axisLabel:{show:false},data:gaugeData,title:{fontSize:14,fontWeight:'normal'},detail:{width:80,height:20,fontSize:14,fontWeight:'normal',borderWidth:0}}]};
```


### Pie Chart
![image](https://github.com/user-attachments/assets/505c7043-3b2b-4666-b9ea-d978080bca6e)

```javascript
const field = context.panel.data.series[0].fields[0];
const remaining = 100 - field.value;
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
            { value: field.value, name: field.name },
            { value: remaining, name: 'Remaining' }
        ]
    }]
};
```

## 🎨 Customization

### Colors
- Use hexadecimal colors: `'#91cc75'`
- Use gradients:
```javascript
new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: '#83bff6' },
    { offset: 1, color: '#188df0' }
])
```

### Number Formatting
```javascript
// 2 decimal places
formatter: function(value) {
    return value.toFixed(2) + field.units;
}

// Using context helper
formatter: function(value) {
    return context.helpers.formatNumber(value, 2) + field.units;
}
```

### Positioning
```javascript
// Centered
offsetCenter: [0, '70%']

// Custom grid
grid: {
    top: '5%',
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
}
```

## 🔧 Available Helpers

```javascript
// Format date
context.helpers.formatDate(timestamp)

// Format number
context.helpers.formatNumber(value, decimals)

// Format bytes
context.helpers.formatBytes(bytes)

// Generate colors
context.helpers.generateColors(count)

// Create gradient
context.helpers.createGradient(color)
```

## 📝 Tips and Tricks

1. **Dark/Light Theme**
   - Widget automatically adapts to Zabbix theme
   - Use contrasting colors for better visibility

2. **Responsiveness**
   - Charts automatically resize
   - Use percentages for relative dimensions

3. **Performance**
   - Avoid complex animations in frequent updates
   - Use `animation: false` for better performance

4. **Debug**
   - Check browser console for detailed logs
   - Use debug mode for additional information

5. **Long Configurations**
   - For complex charts, you might encounter a "value is too long" error
   - In these cases, remove all line breaks and unnecessary spaces
   - Put the entire configuration in a single line
   - Use minification techniques to reduce code length
   - Consider splitting complex logic into smaller parts

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests.

## 📄 License

This project is licensed under the GNU General Public License v2.0 - see the [LICENSE](LICENSE) file for details. 
