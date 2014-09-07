angular.module('pivotchart.powerpaste', [])
  .factory('powerpaste', function ($http, $modal, $location) {
    function integr(t, f) {
      var sum = 0;
      for (var i = 0; i < t.length - 1; i++) {
        var dt = t[i + 1] - t[i];
        var ff = (f[i + 1] + f[i]) / 2;
        sum += ff * dt;
      }
      return sum / (t[t.length - 1] - t[0]);
    }
    function transformJson(data, integrate) {
      var d, columns;
      if (integrate) {
        d = _(data.charts).map(function(c) {
          var dd = _.transpose(c.table.rows);
          var t = dd[0];
          return [c.title].concat(_(dd).rest().map(_.partial(integr, t)).value());
        }).value();
        columns = _.rest(data.charts[0].table.columnNames);
      } else {
        d = _(data.charts).map(function(c) {
          return _.map(c.table.rows, function (row) {
            return [c.title].concat(row);
          });
        }).flatten(true).value();
        columns = data.charts[0].table.columnNames;
      }
      var titlerow = ['Test case'].concat(columns);
      d.unshift(titlerow);
      return d;
    }
    function login(callback) {
      var ModalInstanceCtrl = function ($scope, $modalInstance) {
        $scope.data = { username: '', password: '', };
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
        $scope.ok = function () {
          var url = '/proxy/rest/login?login=' + encodeURIComponent($scope.data.username) +
                    '&password=' + encodeURIComponent($scope.data.password);
          $http.get(url).success(function(data) {
            if (data.loggedIn) {
              $modalInstance.dismiss('ok');
              callback();
            } else {
              $scope.error = data.loginError;
            }
          }).error(function(data, status, headers, config) {
            $scope.error = data;
          });
        };
      };
      var modalInstance = $modal.open({
        templateUrl: 'src/templates/login.html',
        controller: ModalInstanceCtrl,
        windowClass: 'login',
      });
    }

    function load(workspaceId, integrate, callback) {
      var base = $location.protocol() + '://' + $location.host();
      if ($location.port()) {
        base += ':' + $location.port();
      }
      var url = base + '/proxy/rest/workspace?workspaceId=' + workspaceId;
      $http({method: 'get', url: url})
        .success(function (data) {
          callback(transformJson(data, integrate), url);
        })
        .error(function (data, status) {
          if (status == 403) {
            login(_.partial(load, workspaceId, integrate, callback));
          } else {
            alert('failed to get workspace ' + data);
          }
        });
    }

    return {
      load: load,
    };
  });

