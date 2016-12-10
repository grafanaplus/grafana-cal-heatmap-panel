'use strict';

System.register(['app/core/time_series2', 'app/plugins/sdk', 'moment', './bower_components/d3/d3.js', './bower_components/cal-heatmap/cal-heatmap.js'], function (_export, _context) {
  "use strict";

  var TimeSeries, MetricsPanelCtrl, moment, _createClass, CalHeatMapCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appCoreTime_series) {
      TimeSeries = _appCoreTime_series.default;
    }, function (_appPluginsSdk) {
      MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
    }, function (_moment) {
      moment = _moment.default;
    }, function (_bower_componentsD3D3Js) {}, function (_bower_componentsCalHeatmapCalHeatmapJs) {}],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('CalHeatMapCtrl', CalHeatMapCtrl = function (_MetricsPanelCtrl) {
        _inherits(CalHeatMapCtrl, _MetricsPanelCtrl);

        function CalHeatMapCtrl($scope, $element, $injector) {
          _classCallCheck(this, CalHeatMapCtrl);

          var _this = _possibleConstructorReturn(this, (CalHeatMapCtrl.__proto__ || Object.getPrototypeOf(CalHeatMapCtrl)).call(this, $scope, $injector));

          var panelDefaults = {
            datasource: null,
            config: {
              animationDuration: 0,
              domain: 'auto',
              subDomain: 'auto',
              verticalOrientation: false,
              colLimit: null,
              rowLimit: null,
              cellSize: 10,
              cellPadding: 2,
              cellRadius: 0,
              domainGutter: 2,
              label: {
                position: 'bottom',
                rotate: 'null',
                width: 60
              },
              legendStr: '',
              legendColors: {
                min: "#666",
                max: "steelblue",
                empty: "#222",
                base: "transparent"
              },
              displayLegend: true
            }
          };

          _.defaults(_this.panel, angular.copy(panelDefaults));
          _this.seriesList = [];

          _this.element = $element;
          _this.events.on('render', _this.onRender.bind(_this));
          _this.events.on('data-received', _this.onDataReceived.bind(_this));
          _this.events.on('data-error', _this.onDataError.bind(_this));
          _this.events.on('data-snapshot-load', _this.onDataSnapshotLoad.bind(_this));
          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          return _this;
        }

        _createClass(CalHeatMapCtrl, [{
          key: 'seriesHandler',
          value: function seriesHandler(seriesData, index) {
            var datapoints = seriesData.datapoints;
            var alias = seriesData.target;

            var series = new TimeSeries({
              datapoints: datapoints,
              alias: alias,
              color: index,
              unit: false
            });

            if (datapoints && datapoints.length > 0) {
              var last = moment.utc(datapoints[datapoints.length - 1][1]);

              this.datapointsCount += datapoints.length;
            }

            return series;
          }
        }, {
          key: 'calcThresholds',
          value: function calcThresholds(data, subDomain) {
            var cells = {}; // emulate Cal-HeatMap's cell splitter
            var unitLen = {};
            var tzOffset = new Date().getTimezoneOffset() * 60;

            var to_i;
            if (subDomain == 'week') to_i = function to_i(t) {
              return t - t % (24 * 60 * 60) - new Date(t * 1000).getDay() * (24 * 60 * 60);
            };else if (subDomain == 'day') to_i = function to_i(t) {
              return t - t % (24 * 60 * 60);
            };else if (subDomain == 'hour') to_i = function to_i(t) {
              return t - t % (60 * 60);
            };else if (subDomain == 'min') to_i = function to_i(t) {
              return t - t % 60;
            };else throw "Invalid subDomain in calcThresholds()";

            for (var x in data) {
              var y = parseFloat(data[x]);
              if (isNaN(y)) continue;
              var i = to_i(parseInt(x) + tzOffset);
              if (cells[i]) cells[i] += y;else cells[i] = y;
            }

            var count = 0,
                sum = 0,
                sumsq = 0,
                min = Infinity,
                max = -Infinity;

            for (var x in cells) {
              var y = parseFloat(cells[x]);
              if (isNaN(y)) continue;
              count++;
              sum += y;
              sumsq += y * y;
              min = Math.min(min, y);
              max = Math.max(max, y);
            }
            var avg = sum / count;
            var sd = Math.sqrt((sumsq - avg * avg) / count);
            var thresh = [];
            min = Math.max(min, avg - sd * 1.5);
            max = Math.min(max, avg + sd * 1.5);
            for (var i = 0; i < 9; i++) {
              thresh[i] = min + (max - min) / 8 * i;
            }return thresh;
          }
        }, {
          key: 'onInitEditMode',
          value: function onInitEditMode() {
            this.addEditorTab('Options', 'public/plugins/neocat-cal-heatmap-panel/editor.html', 2);
          }
        }, {
          key: 'onDataSnapshotLoad',
          value: function onDataSnapshotLoad(snapshotData) {
            this.onDataReceived(snapshotData.data);
          }
        }, {
          key: 'onDataError',
          value: function onDataError(err) {
            this.seriesList = [];
            this.render([]);
          }
        }, {
          key: 'onDataReceived',
          value: function onDataReceived(dataList) {
            this.seriesList = dataList.map(this.seriesHandler.bind(this));
            this.render(this.seriesList);
          }
        }, {
          key: 'onRender',
          value: function onRender() {
            if (!this.seriesList || !this.seriesList[0]) this.seriesList = [{ "datapoints": [] }];

            var subDomains = {
              'auto': ['auto'],
              'month': ['auto', 'day', 'x_day', 'week', 'x_week'],
              'day': ['auto', 'hour', 'x_hour'],
              'hour': ['auto', 'min', 'x_min']
            };
            var cand = subDomains[this.panel.config.domain];
            if (!cand || cand.indexOf(this.panel.config.subDomain) < 0) this.panel.config.subDomain = 'auto';

            var elem = this.element.find(".cal-heatmap-panel")[0];
            var update = function () {
              if (!this.range) return;

              var data = {};
              var points = this.seriesList[0].datapoints;
              for (var i = 0; i < points.length; i++) {
                data[points[i][1] / 1000] = points[i][0];
              }

              var from = moment.utc(this.range.from);
              var to = moment.utc(this.range.to);
              var days = to.diff(from, "days") + 1;
              var cal = this.cal = new CalHeatMap();

              var config = angular.copy(this.panel.config);
              config.itemSelector = elem;
              config.data = data;
              config.label.position = config.verticalOrientation ? 'left' : 'bottom';

              if (config.domain == 'auto') {
                config.domain = days > 31 ? "month" : days > 3 ? "day" : "hour";
              }
              if (config.subDomain == 'auto') {
                delete config.subDomain;
              }
              config.start = moment.utc(this.range.from).toDate();
              if (config.domain == 'month') {
                config.range = moment.utc(to.format('YYYY-MM')).diff(moment.utc(from.format('YYYY-MM')), "months") + 1;
                config.domainLabelFormat = '%y/%m';
              } else if (config.domain == 'day') {
                config.range = moment.utc(to.format('YYYY-MM-DD')).diff(moment.utc(from.format('YYYY-MM-DD')), "days") + 1;
                config.domainLabelFormat = '%m/%d';
              } else if (config.domain == 'hour') {
                config.range = moment.utc(to.format('YYYY-MM-DD HH:00')).diff(moment.utc(from.format('YYYY-MM-DD HH:00')), "hours") + 1;
                config.domainLabelFormat = '%d %H:%M';
              }
              config.range = Math.min(config.range, 100); // avoid browser hang

              if (!config.legendStr || config.legendStr == 'auto') {
                var subDomain = config.subDomain ? config.subDomain.replace('x_', '') : subDomains[config.domain][1];
                config.legend = this.calcThresholds(data, subDomain);
              } else {
                config.legend = config.legendStr ? config.legendStr.split(/\s*,\s*/).map(function (x) {
                  return parseFloat(x);
                }) : null;
              }

              this.cal.init(config);
            }.bind(this);

            if (this.cal) {
              try {
                this.cal.destroy(update);
              } catch (e) {
                console.log("Destroy failed: " + e);
                elem.innerHTML = '';
                update();
              }
            } else {
              update();
            }
          }
        }]);

        return CalHeatMapCtrl;
      }(MetricsPanelCtrl));

      _export('CalHeatMapCtrl', CalHeatMapCtrl);

      CalHeatMapCtrl.templateUrl = 'module.html';
    }
  };
});
//# sourceMappingURL=cal_heatmap_ctrl.js.map
