angular.module('app')
  .factory('UserDashboardService', function($http, $q) {
    var USERS_URL = 'https://api.example.com/users';

    // Private in-memory cache.
    var users = [];

    // Cache the in-flight request to avoid duplicate GETs.
    var usersLoadedPromise = null;

    function loadUsers() {
      if (usersLoadedPromise) return usersLoadedPromise;

      usersLoadedPromise = $http.get(USERS_URL)
        .then(function(response) {
          users = Array.isArray(response.data) ? response.data : [];
          return users;
        })
        .catch(function(err) {
          usersLoadedPromise = null;
          return $q.reject(err);
        });

      return usersLoadedPromise;
    }

    function getUsers() {
      return loadUsers();
    }

    function getUser(id) {
      var idStr = String(id);
      for (var i = 0; i < users.length; i++) {
        if (users[i] && String(users[i].id) === idStr) return users[i];
      }
      return null;
    }

    function updateUser(id, changes) {
      if (id === undefined || id === null) {
        return $q.reject(new Error('Missing user id'));
      }

      return $http.put(USERS_URL + '/' + id, changes)
        .then(function() {
          // Ensure local cache matches server state.
          return loadUsers();
        });
    }

    function searchUsers(query) {
      var q = (typeof query === 'string' ? query : '').trim().toLowerCase();

      if (!q) return users.slice();

      return users.filter(function(u) {
        var name = u && u.name ? String(u.name).toLowerCase() : '';
        var email = u && u.email ? String(u.email).toLowerCase() : '';
        return name.indexOf(q) !== -1 || email.indexOf(q) !== -1;
      });
    }

    return {
      loadUsers: loadUsers,
      getUsers: getUsers,
      getUser: getUser,
      updateUser: updateUser,
      searchUsers: searchUsers
    };
  });

