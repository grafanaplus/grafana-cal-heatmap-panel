import TimeSeries from 'app/core/time_series2';
import {MetricsPanelCtrl} from 'app/plugins/sdk';
import moment from 'moment';
import './bower_components/d3/d3.js';
import './bower_components/cal-heatmap/cal-heatmap.js';

export class CalHeatMapCtrl extends MetricsPanelCtrl {
  constructor($scope, $element, $injector) {
    super($scope, $injector);

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
          width: 60,
        },
        legendStr: '',
        legendColors: {
          min: "#666",
          max: "steelblue",
          empty: "#222",
          base: "transparent",
        },
        displayLegend: true,
      },
    };

    _.defaults(this.panel, angular.copy(panelDefaults));
    this.seriesList = [];

    this.element = $element;
    this.events.on('render', this.onRender.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataSnapshotLoad.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
  }

  seriesHandler(seriesData, index) {
    var datapoints = seriesData.datapoints;
    var alias = seriesData.target;

    var series = new TimeSeries({
      datapoints: datapoints,
      alias: alias,
      color: index,
      unit: false,
    });

    if (datapoints && datapoints.length > 0) {
      var last = moment.utc(datapoints[datapoints.length - 1][1]);

      this.datapointsCount += datapoints.length;
    }

    return series;
  }

  calcThresholds(data, subDomain) {
    var cells = {}; // emulate Cal-HeatMap's cell splitter
    var unitLen = {};
    var tzOffset = (new Date()).getTimezoneOffset() * 60;

    var to_i;
    if (subDomain == 'week')
      to_i = t => t - t % (24*60*60) - (new Date(t * 1000)).getDay() * (24*60*60);
    else if (subDomain == 'day')
      to_i = t => t - t % (24*60*60);
    else if (subDomain == 'hour')
      to_i = t => t - t % (60*60);
    else if (subDomain == 'min')
      to_i = t => t - t % 60;
    else
      throw "Invalid subDomain in calcThresholds()";

    for (var x in data) {
      var y = parseFloat(data[x]);
      if (isNaN(y))
        continue;
      var i = to_i(parseInt(x) + tzOffset);
      if (cells[i])
        cells[i] += y;
      else
        cells[i] = y;
    }

    var [count, sum, sumsq, min, max] = [0, 0, 0, Infinity, -Infinity];
    for (var x in cells) {
      var y = parseFloat(cells[x]);
      if (isNaN(y))
        continue;
      count++;
      sum += y;
      sumsq += y * y;
      min = Math.min(min, y);
      max = Math.max(max, y);
    }
    var avg = sum / count;
    var sd = Math.sqrt((sumsq - avg*avg) / count);
    var thresh = [];
    min = Math.max(min, avg - sd*1.5);
    max = Math.min(max, avg + sd*1.5);
    for (var i = 0; i < 9; i++)
      thresh[i] = min + (max - min) / 8 * i;
    return thresh;
  }

  onInitEditMode() {
    this.addEditorTab('Options',
                      'public/plugins/neocat-cal-heatmap-panel/editor.html',
                      2);
  }

  onDataSnapshotLoad(snapshotData) {
    this.onDataReceived(snapshotData.data);
  }

  onDataError(err) {
    this.seriesList = [];
    this.render([]);
  }

  onDataReceived(dataList) {
    this.seriesList = dataList.map(this.seriesHandler.bind(this));
    this.render(this.seriesList);
  }

  onRender() {
    if (!this.seriesList || !this.seriesList[0])
      this.seriesList = [{"datapoints":[]}];

    var subDomains = {
      'auto':  ['auto'],
      'month': ['auto', 'day', 'x_day', 'week', 'x_week'],
      'day':   ['auto', 'hour', 'x_hour'],
      'hour':  ['auto', 'min', 'x_min']
    };
    var cand = subDomains[this.panel.config.domain];
    if (!cand || cand.indexOf(this.panel.config.subDomain) < 0)
      this.panel.config.subDomain = 'auto';

    var elem = this.element.find(".cal-heatmap-panel")[0];
    var update = function() {
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

      var config = angular.copy(this.panel.config)
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
        config.range = moment.utc(to.format('YYYY-MM')).diff(
          moment.utc(from.format('YYYY-MM')), "months") + 1;
        config.domainLabelFormat = '%y/%m';
      }
      else if (config.domain == 'day') {
        config.range = moment.utc(to.format('YYYY-MM-DD')).diff(
          moment.utc(from.format('YYYY-MM-DD')), "days") + 1;
        config.domainLabelFormat = '%m/%d';
      }
      else if (config.domain == 'hour') {
        config.range = moment.utc(to.format('YYYY-MM-DD HH:00')).diff(
          moment.utc(from.format('YYYY-MM-DD HH:00')), "hours") + 1;
        config.domainLabelFormat = '%d %H:%M';
      }
      config.range = Math.min(config.range, 100); // avoid browser hang

      if (!config.legendStr || config.legendStr == 'auto') {
        var subDomain = config.subDomain ?
            config.subDomain.replace('x_', '') : subDomains[config.domain][1];
        config.legend = this.calcThresholds(data, subDomain);
      } else {
        config.legend = config.legendStr ?
          config.legendStr.split(/\s*,\s*/).map(x => parseFloat(x)) : null;
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

}

CalHeatMapCtrl.templateUrl = 'module.html';
