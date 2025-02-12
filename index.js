import {
  Chart,
  BarController,
  DoughnutController,
  LineController,
  PieController,
  PolarAreaController,
  RadarController,
  BubbleController,
  ScatterController,
} from "chart.js";

var ChartEmits;
(function (ChartEmits) {
  ChartEmits["ChartRendered"] = "chart:rendered";
  ChartEmits["ChartUpdated"] = "chart:updated";
  ChartEmits["ChartDestroyed"] = "chart:destroyed";
  ChartEmits["LabelsUpdated"] = "labels:updated";
})(ChartEmits || (ChartEmits = {}));
function chartCreate(createChartFunction, chartData, chartOptions, context) {
  createChartFunction(chartData, chartOptions);
  if (context !== undefined) {
    context.emit(ChartEmits.ChartRendered);
  }
}
function chartUpdate(chart, context) {
  chart.update();
  if (context !== undefined) {
    context.emit(ChartEmits.ChartUpdated);
  }
}
function chartDestroy(chart, context) {
  chart.destroy();
  if (context !== undefined) {
    context.emit(ChartEmits.ChartDestroyed);
  }
}
function getChartData(data, datasetIdKey) {
  const nextData = {
    labels: typeof data.labels === "undefined" ? [] : [...data.labels],
    datasets: [],
  };
  setChartDatasets(
    nextData,
    {
      ...data,
    },
    datasetIdKey
  );
  return nextData;
}
function setChartDatasets(oldData, newData, datasetIdKey) {
  const addedDatasets = [];
  oldData.datasets = newData.datasets.map((nextDataset) => {
    // given the new set, find it's current match
    const currentDataset = oldData.datasets.find(
      (dataset) => dataset[datasetIdKey] === nextDataset[datasetIdKey]
    );
    // There is no original to update, so simply add new one
    if (
      !currentDataset ||
      !nextDataset.data ||
      addedDatasets.includes(currentDataset)
    ) {
      return {
        ...nextDataset,
      };
    }
    addedDatasets.push(currentDataset);
    Object.assign(currentDataset, nextDataset);
    return currentDataset;
  });
}
function setChartLabels(chart, labels, context) {
  chart.data.labels = labels;
  if (context !== undefined) {
    context.emit(ChartEmits.LabelsUpdated);
  }
}
function setChartOptions(chart, options) {
  chart.options = {
    ...options,
  };
}
function compareData(newData, oldData) {
  // Get new and old DataSet Labels
  const newDatasetLabels = newData.datasets.map((dataset) => {
    return dataset.label;
  });
  const oldDatasetLabels = oldData.datasets.map((dataset) => {
    return dataset.label;
  });
  // Check if Labels are equal and if dataset length is equal
  return (
    oldData.datasets.length === newData.datasets.length &&
    newDatasetLabels.every((value, index) => value === oldDatasetLabels[index])
  );
}
const templateError =
  "Please remove the <template></template> tags from your chart component. See https://vue-chartjs.org/guide/#vue-single-file-components";

const ANNOTATION_PLUGIN_KEY = "annotation";
function generateChart(chartId, chartType, chartController) {
  let _chartRef = {};
  return {
    props: {
      chartData: {
        type: Object,
        required: true,
      },
      chartOptions: {
        type: Object,
        default: () => {},
      },
      datasetIdKey: {
        type: String,
        default: "label",
      },
      chartId: {
        type: String,
        default: chartId,
      },
      width: {
        type: Number,
        default: 400,
      },
      height: {
        type: Number,
        default: 400,
      },
      cssClasses: {
        type: String,
        default: "",
      },
      styles: {
        type: Object,
        default: () => {},
      },
      plugins: {
        type: Object,
        default: () => {},
      },
    },
    data() {
      return {
        _chart: null,
        _id: Math.random().toString(36).substring(2),
      };
    },
    computed: {
      hasAnnotationPlugin() {
        var ref, ref1;
        const pluginSettings =
          (ref = this.chartOptions) === null || ref === void 0
            ? void 0
            : (ref1 = ref.plugins) === null || ref1 === void 0
            ? void 0
            : ref1[ANNOTATION_PLUGIN_KEY];
        return typeof pluginSettings !== "undefined";
      },
    },
    created() {
      Chart.register(chartController);
    },
    mounted() {
      _chartRef[this.$data._id] = null;
      if ("datasets" in this.chartData && this.chartData.datasets.length > 0) {
        chartCreate(this.renderChart, this.chartData, this.chartOptions);
        this.$emit(ChartEmits.ChartRendered);
      }
    },
    watch: {
      chartData: {
        handler: function (newValue, oldValue) {
          this.chartDataHandler(newValue, oldValue);
        },
        deep: true,
      },
      chartOptions: {
        handler: function (newValue) {
          this.chartOptionsHandler(newValue);
        },
        deep: true,
      },
    },
    methods: {
      renderChart(data, options) {
        const currentChart = this.getCurrentChart();
        if (currentChart !== null) {
          chartDestroy(currentChart);
          this.$emit(ChartEmits.ChartDestroyed);
        }
        if (!this.$refs.canvas) {
          throw new Error(templateError);
        } else {
          const chartData = getChartData(data, this.datasetIdKey);
          const canvasEl2DContext = this.$refs.canvas.getContext("2d");
          if (canvasEl2DContext !== null) {
            if (this.plugins) {
              options.plugins = this.plugins;
            }
            this.setCurrentChart(
              new Chart(canvasEl2DContext, {
                type: chartType,
                data: chartData,
                options,
                // plugins: this.plugins,
              })
            );
          }
        }
      },
      chartDataHandler(newValue, oldValue) {
        const newData = {
          ...newValue,
        };
        const oldData = {
          ...oldValue,
        };
        const currentChart = this.getCurrentChart();
        if (Object.keys(oldData).length > 0) {
          const isEqualLabelsAndDatasetsLength = compareData(newData, oldData);
          if (isEqualLabelsAndDatasetsLength && currentChart !== null) {
            setChartDatasets(currentChart.data, newData, this.datasetIdKey);
            if (newData.labels !== undefined) {
              setChartLabels(currentChart, newData.labels);
              this.$emit(ChartEmits.LabelsUpdated);
            }
            this.updateChart();
            this.$emit(ChartEmits.ChartUpdated);
          } else {
            if (currentChart !== null) {
              chartDestroy(currentChart);
              this.$emit(ChartEmits.ChartDestroyed);
            }
            chartCreate(this.renderChart, this.chartData, this.chartOptions);
            this.$emit(ChartEmits.ChartRendered);
          }
        } else {
          if (currentChart !== null) {
            chartDestroy(currentChart);
            this.$emit(ChartEmits.ChartDestroyed);
          }
          chartCreate(this.renderChart, this.chartData, this.chartOptions);
          this.$emit(ChartEmits.ChartRendered);
        }
      },
      chartOptionsHandler(options) {
        const currentChart = this.getCurrentChart();
        if (currentChart !== null) {
          setChartOptions(currentChart, options);
          this.updateChart();
        } else {
          chartCreate(this.renderChart, this.chartData, this.chartOptions);
        }
      },
      updateChart() {
        const currentChart = this.getCurrentChart();
        chartUpdate(currentChart);
      },
      getCurrentChart() {
        return this.hasAnnotationPlugin
          ? _chartRef[this.$data._id]
          : this.$data._chart;
      },
      setCurrentChart(chart) {
        this.hasAnnotationPlugin
          ? (_chartRef[this.$data._id] = chart)
          : (this.$data._chart = chart);
      },
    },
    beforeDestroy() {
      const currentChart = this.getCurrentChart();
      if (currentChart !== null) {
        chartDestroy(currentChart);
        this.$emit(ChartEmits.ChartDestroyed);
      }
    },
    render: function (createElement) {
      return createElement(
        "div",
        {
          style: this.styles,
          class: this.cssClasses,
        },
        [
          createElement("canvas", {
            attrs: {
              id: this.chartId,
              width: this.width,
              height: this.height,
            },
            ref: "canvas",
          }),
        ]
      );
    },
  };
}
/** @type Object */ const Bar = /* #__PURE__ */ generateChart(
  "bar-chart",
  "bar",
  BarController
);
/** @type Object */ const Doughnut = /* #__PURE__ */ generateChart(
  "doughnut-chart",
  "doughnut",
  DoughnutController
);
/** @type Object */ const Line = /* #__PURE__ */ generateChart(
  "line-chart",
  "line",
  LineController
);
/** @type Object */ const Pie = /* #__PURE__ */ generateChart(
  "pie-chart",
  "pie",
  PieController
);
/** @type Object */ const PolarArea = /* #__PURE__ */ generateChart(
  "polar-chart",
  "polarArea",
  PolarAreaController
);
/** @type Object */ const Radar = /* #__PURE__ */ generateChart(
  "radar-chart",
  "radar",
  RadarController
);
/** @type Object */ const Bubble = /* #__PURE__ */ generateChart(
  "bubble-chart",
  "bubble",
  BubbleController
);
/** @type Object */ const Scatter = /* #__PURE__ */ generateChart(
  "scatter-chart",
  "scatter",
  ScatterController
);

export {
  Bar,
  Bubble,
  Doughnut,
  Line,
  Pie,
  PolarArea,
  Radar,
  Scatter,
  generateChart,
};
//# sourceMappingURL=index.js.map
