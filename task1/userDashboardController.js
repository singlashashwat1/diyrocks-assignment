angular.module('app')
  .controller('UserDashboardController', function($scope, $timeout, UserDashboardService) {
    $scope.searchQuery = '';
    $scope.filteredUsers = [];
    $scope.loading = true;
    $scope.error = null;
    $scope.adminUpdatingUserId = null;

    // Initial load: only render list after GET /users completes.
    UserDashboardService.getUsers()
      .then(function() {
        $scope.filteredUsers = UserDashboardService.searchUsers($scope.searchQuery);
      })
      .catch(function() {
        $scope.error = 'Failed to load users.';
      })
      .then(function() {
        $scope.loading = false;
      });

    // Debounced search: avoids O(n) filtering on every single keystroke.
    var searchDebounceTimer = null;

    $scope.$watch('searchQuery', function(newValue) {
      if (searchDebounceTimer) $timeout.cancel(searchDebounceTimer);

      searchDebounceTimer = $timeout(function() {
        $scope.filteredUsers = UserDashboardService.searchUsers(newValue);
      }, 200);
    });

    $scope.makeAdmin = function(user) {
      if (!user || user.id === undefined || user.id === null) return;

      $scope.error = null;
      $scope.adminUpdatingUserId = user.id;

      UserDashboardService.updateUser(user.id, { role: 'admin' })
        .then(function() {
          // Refresh search results using the current query.
          $scope.filteredUsers = UserDashboardService.searchUsers($scope.searchQuery);
        }, function() {
          $scope.error = 'Failed to update user role.';
        })
        .then(function() {
          $scope.adminUpdatingUserId = null;
        });
    };
  });

