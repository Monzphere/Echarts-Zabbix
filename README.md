# ECharts Widget for Zabbix - [Monzphere](https://monzphere.com)

This module adds a customizable widget to Zabbix that allows creating interactive charts using the ECharts library.

![image](https://github.com/user-attachments/assets/0b321c1d-8993-477a-93df-a9ae55dbdb62)


## 🚀 Features

- Support for multiple chart types:
  - Gauge
  - Liquid Chart
  - Pie Chart
  - Horizontal Bar Chart
  - Multi-level Gauge
  - Treemap Chart
  - Nightingale Rose Chart
  - Funnel Chart
  - Treemap/Sunburst Chart
  - LLD Table
  - **Temporal Line Chart** (NEW)
  - **Temporal Area Chart** (NEW)

- **6 built-in color themes** for different environments and use cases
- Simplified configuration through Zabbix interface
- Automatic item unit detection
- Real-time updates
- Light/Dark theme support
- Interactive and responsive tooltips
- Interactive zoom and navigation
- Automatic value formatting based on item units

## 🎨 Color Themes

The module includes **6 carefully designed color themes** that ensure optimal visibility and accessibility:

### Available Themes:
1. **Default** - ECharts standard colors with excellent contrast
2. **Zabbix** - Native Zabbix trigger severity colors (Information, Warning, Average, High, Disaster)
3. **Pastel** - Soft, pastel colors for a subtle appearance
4. **Bright** - Vibrant, high-contrast colors for better visibility
5. **Dark** - Deep, saturated colors perfect for dark themes
6. **Blue Monochrome** - Various shades of blue for a professional look

### Intelligent Color Distribution
- **Smart Allocation**: Colors are distributed evenly across data series
- **Automatic Cycling**: When you have more series than colors, the system intelligently cycles through the palette
- **Consistent Mapping**: Each data series maintains its color throughout the visualization
- **Accessibility Compliant**: All themes follow accessibility guidelines for color contrast

## 📊 Chart Types

### Gauge
- Displays value in a circular gauge format
- Dynamic colors based on value with theme-aware palettes
- Support for multiple color ranges
- Smooth value update animation

### Liquid Chart
- Liquid fill visualization
- Fluid animation
- Dynamic colors based on value
- Perfect for percentage representation

### Pie Chart
- Pie/donut visualization
- Support for multiple values with intelligent color distribution
- Informative labels with theme-consistent styling
- Hover interaction with enhanced color emphasis

### Horizontal Bar Chart
- Horizontal bar visualization
- Automatic value-based sorting
- Pagination support for many items
- Informative labels with units

### Multi-level Gauge
- Multiple gauges in a single chart
- Distinct colors for each level
- Independent level animation
- Ideal for comparisons

### Treemap Chart
- Hierarchical data visualization
- Interactive zoom
- Dynamic value-based colors
- Breadcrumb navigation

### Nightingale Rose Chart
- Segmented circular visualization
- Perfect for value comparison
- Informative tooltips
- Interactive animation

### Funnel Chart
- Funnel-shaped visualization
- Ideal for sequential processes
- Informative labels
- Smooth animation

### Treemap/Sunburst Chart
- Automatic alternation between views
- Animated transition
- Rich interaction
- Perfect for hierarchical data

### LLD Table
- Table format visualization
- Pagination support
- Column sorting
- Automatic value formatting

### Temporal Line Chart ⭐ NEW
- **Modern, clean visualization** with optimized layout and reduced visual clutter
- Historical data visualization over time with **interactive zoom and pan**
- Multiple items displayed as different colored lines with smooth animations
- **Native Zabbix time period integration** - fully compatible with dashboard time filters
- **Smart tooltips** with enhanced formatting and cross-axis indicators
- **Auto-scaling Y-axis labels** (K, M, G formatting for large numbers)
- **Intelligent time formatting** - shows time for today, date+time for other days
- Configurable smooth lines, legend, and grid display
- Real-time data updates with staggered animations
- Time period indicator in widget header
- **Responsive design** that adapts to widget size

### Temporal Area Chart ⭐ NEW
- **Beautiful gradient fill areas** with transparency effects
- All temporal line chart features included
- **Overlapping area visualization** instead of stacking for better readability
- Perfect for visualizing data trends and accumulations
- **Native Zabbix time period integration**
- Enhanced visual appeal with modern gradients

## 🔧 Configuration

1. **Chart Type**: Select desired chart type
2. **Color Theme**: Choose from 6 professional color themes
3. **Items**: Choose items to monitor
4. For temporal charts, configure:
   - **Time period** - uses native Zabbix time period selector with dashboard time filter integration
   - Show/hide legend
   - Show/hide grid
   - Enable/disable smooth lines
5. The widget automatically:
   - Detects item units
   - Formats values appropriately
   - Adjusts colors and scales
   - Configures tooltips and interactions
   - Retrieves historical data for temporal charts

## 📈 Value Formatting

The widget automatically formats values based on item units:
- Bytes (B, KB, MB, GB, TB)
- Percentages (%)
- Rates per second (B/s, KB/s, etc)
- Numeric values with appropriate precision
- Scientific notation for very large/small values

## 🎨 Visual Customization

- Adaptive colors based on values
- Light/Dark themes
- Responsive and always visible tooltips
- Smooth interactions and animations
- Responsive layout that adapts to widget size

## ⏰ Temporal Charts Features

- **Native Zabbix Integration**: Uses Zabbix's History API for data retrieval and `CWidgetFieldTimePeriod` for time management
- **Dashboard Time Filter Integration**: Seamlessly works with dashboard time filters and global time settings
- **Time Period Display**: Shows current time period in widget header with visual indicator
- **Performance Optimized**: Efficient data loading with configurable limits (max 1000 points per item)
- **Real-time Updates**: Automatic refresh following widget refresh intervals
- **Multi-item Support**: Display multiple items on the same temporal chart with distinct colors
- **Interactive Navigation**: Zoom, pan, and tooltip interactions with ECharts
- **Responsive Design**: Adapts to different widget sizes and screen resolutions
- **Professional Time Formatting**: Consistent with other Zabbix time-based widgets

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests.

## 📄 License

This project is licensed under the AGPL-3.0 license
