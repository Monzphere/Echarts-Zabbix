/**
 * ECharts widget form initialization
 */
document.addEventListener('DOMContentLoaded', function() {
	// Inicializar quando o formulário do widget for carregado
	const initializeForm = function() {
		const form = document.getElementById('widget-dialogue-form');
		if (!form) return;

		// Inicializar colorpicker para todos os campos de cor
		const colorPickers = form.querySelectorAll('.color-picker input, .color-picker input');
		colorPickers.forEach(function(colorpicker) {
			if (jQuery && jQuery.fn.colorpicker) {
				jQuery(colorpicker).colorpicker({
					appendTo: '.overlay-dialogue-body',
					use_default: true
				});
			}
		});

		// Lógica para mostrar/ocultar campos baseado no tipo de gráfico
		const displayTypeSelect = form.querySelector('select[name="display_type"]');
		if (displayTypeSelect) {
			const updateFields = function() {
				const displayType = parseInt(displayTypeSelect.value);
				const temporalTypes = [11, 12]; // TEMPORAL_LINE e TEMPORAL_AREA
				const isTemporalChart = temporalTypes.includes(displayType);
				
				// Campos específicos para gráficos temporais
				const temporalFields = ['show_legend', 'show_grid', 'smooth_lines'];
				temporalFields.forEach(function(fieldName) {
					const field = form.querySelector('[name="' + fieldName + '"]');
					if (field) {
						const fieldRow = field.closest('.form-field');
						if (fieldRow) {
							fieldRow.style.display = isTemporalChart ? '' : 'none';
						}
					}
				});
			};

			displayTypeSelect.addEventListener('change', updateFields);
			updateFields(); // Executar na inicialização
		}
	};

	// Tentar inicializar imediatamente
	initializeForm();

	// Também escutar por mudanças no DOM para capturar quando o formulário for carregado
	const observer = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			if (mutation.type === 'childList') {
				mutation.addedNodes.forEach(function(node) {
					if (node.nodeType === 1 && (node.id === 'widget-dialogue-form' || node.querySelector('#widget-dialogue-form'))) {
						setTimeout(initializeForm, 100);
					}
				});
			}
		});
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true
	});
}); 