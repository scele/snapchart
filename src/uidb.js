angular.module('pivotchart.uidb', [])
  .factory('uidb', function ($http, $modal, $location) {
    function transformJson(data) {
      var columns = [
        'Test',
        'Compositor',
        'Chip',
        'Tag',
        'EMC Clock',
        'GPU Clock',
        'VIC Clock',
        'CPU Clock',
        'Content gen.',
        'Composition',
        'Decompression',
        'GPU Read',
        'GPU Write',
        'VIC Read',
        'VIC Write',
        'Display Read',
        'GPU mJ',
        'SOC mJ',
        'DRAM mJ',
        'CPU mJ',
      ];

      var rows = _(data).map(function (d) {
        var common = [
          d.test,
          d.compositor,
          d.chip,
          '',
          d.emc_clock,
          d.gpu_clock,
          d.vic_clock,
          d.cpu_clock,
        ];
        var measured = [
          d.contentgen_tpf,
          d.composition_tpf,
          d.decomp_tpf,
          d.GPUSRD || 0,
          d.GPUSWR || 0,
          d.VICSRD || 0,
          d.VICSWR || 0,
          d.DISPLAY0A || 0,
          d.gpu_epf,
          d.soc_epf,
          d.dram_epf,
          d.cpu_epf,
        ];
        var sol = [
          d.sol_contentgen_tpf,
          d.sol_composition_tpf,
          d.sol_decomp_tpf,
          d.sol_gpu_read_bw,
          d.sol_gpu_write_bw,
          d.sol_vic_read_bw,
          d.sol_vic_write_bw,
          0,
          0,
          0,
          0,
          0,
        ];
        measured = common.concat(measured);
        sol = common.concat(sol);
        measured[3] = 'Actual';
        sol[3] = 'SOL';
        var view = $location.search().view;
        if (view == 'energy')
          return [measured];
        else
          return [measured, sol];
        //'ALL': 'Total bandwidth',
        //'tpf': '',
        //'tpf_latency': '',
        //'cpu_power': '',
        //'dram_power': '',
        //'fps': '',
        //'gpu_power': '',
        //'measurementId': '',
        //'other_epf': '',
        //'other_power': '',
        //'sessionId': '',
        //'soc_power': '',
        //'sol_bottleneck': 'SOL Bottleneck',
        //d.sol_tpf,
        //d.sol_tpf_bwlimited,
        //d.sol_tpf_clocklimited,
        //d.sol_tpf_latency,
      }).flatten(true).value();
      rows.unshift(columns);
      return rows;
    }

// http://lpeltonen-lnx:3000/#/uidb/omni_t210.json
    function load(arg, callback) {
      var base = $location.protocol() + '://' + $location.host();
      if ($location.port()) {
        base += ':' + $location.port();
      }
      var url = base + '/uidb-proxy/d/' + arg;
      $http({method: 'get', url: url})
        .success(function (data) {
          callback(transformJson(data), url);
        })
        .error(function (data, status) {
          alert('failed to load data ' + data);
        });
    }

    return {
      load: load,
    };
  });

