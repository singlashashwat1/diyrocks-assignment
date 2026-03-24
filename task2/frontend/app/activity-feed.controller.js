angular.module('activityFeedApp').controller('ActivityFeedController', [
  '$scope',
  'ActivityFeedService',
  function ($scope, ActivityFeedService) {
    $scope.events = [];
    $scope.counts = { low: 0, normal: 0, high: 0 };
    $scope.priorities = ['low', 'normal', 'high'];
    $scope.form = { type: '', message: '', priority: 'normal' };
    $scope.submitting = false;
    $scope.rateLimitMessage = null;
    $scope.streamStatus = 'connecting';

    function recomputeCounts() {
      var c = { low: 0, normal: 0, high: 0 };
      $scope.events.forEach(function (e) {
        c[e.priority]++;
      });
      $scope.counts = c;
    }

    function syncFromServer() {
      return ActivityFeedService.fetchEvents().then(function (res) {
        $scope.events = res.data || [];
        recomputeCounts();
      });
    }

    syncFromServer().then(
      angular.noop,
      function (res) {
        $scope.rateLimitMessage =
          'Could not load events from the server. Is the API running?';
      },
    );

    var closeStream = ActivityFeedService.openEventSource({
      onopen: function () {
        $scope.$apply(function () {
          $scope.streamStatus = 'connected';
        });
      },
      onerror: function () {
        $scope.$apply(function () {
          $scope.streamStatus = 'error / reconnecting';
        });
      },
      onmessage: function (ev) {
        var payload = JSON.parse(ev.data);
        if (payload && payload.kind === 'heartbeat') {
          return;
        }
        // Backend is the source of truth for evictions; pull full snapshot after each push.
        syncFromServer().then(function () {
          if (!$scope.$$phase) {
            $scope.$applyAsync();
          }
        });
      },
    });

    if (!closeStream) {
      $scope.streamStatus = 'EventSource not supported';
    }

    $scope.$on('$destroy', function () {
      if (closeStream) closeStream();
    });

    $scope.submitEvent = function () {
      $scope.rateLimitMessage = null;
      $scope.submitting = true;
      ActivityFeedService.postEvent({
        type: $scope.form.type,
        message: $scope.form.message,
        priority: $scope.form.priority,
      })
        .then(
          function () {
            $scope.form = {
              type: '',
              message: '',
              priority: $scope.form.priority,
            };
          },
          function (err) {
            var statusCode = err && err.status ? err.status : 'unknown';
            if (err.status === 429) {
              $scope.rateLimitMessage =
                'Error ' +
                statusCode +
                ': The server buffer is full (5 events) and every stored event is high priority. Nothing can be evicted — try again after high-priority events are cleared or use a lower priority if policy allows.';
            } else {
              $scope.rateLimitMessage =
                'Error ' +
                statusCode +
                ': ' +
                ((err.data && err.data.message) || 'Failed to publish event.');
            }
          },
        )
        .finally(function () {
          $scope.submitting = false;
        });
    };
  },
]);
