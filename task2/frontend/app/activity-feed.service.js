angular.module('activityFeedApp').factory('ActivityFeedService', [
  '$http',
  '$window',
  function ($http, $window) {
    return {
      fetchEvents: function () {
        return $http.get('/events');
      },
      postEvent: function (body) {
        return $http.post('/events', body);
      },
      /**
       * @param {{ onopen?: () => void, onerror?: () => void, onmessage?: (ev: MessageEvent) => void }} handlers
       * @returns {null | (() => void)} close function, or null if EventSource unsupported
       */
      openEventSource: function (handlers) {
        var EventSourceCtor = $window.EventSource;
        if (!EventSourceCtor) return null;
        var es = new EventSourceCtor('/events/stream');
        if (handlers.onopen) es.onopen = handlers.onopen;
        if (handlers.onerror) es.onerror = handlers.onerror;
        if (handlers.onmessage) es.onmessage = handlers.onmessage;
        return function close() {
          es.close();
        };
      },
    };
  },
]);
