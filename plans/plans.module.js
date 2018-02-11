//////////////////////////////////////
// App : Plans						//
// Owner  : Gihan Herath			//
// Last changed date : 2017/01/29	//
// Version : 6.1.0.31				//
// Modified By : Kasun				//
//////////////////////////////////////

(function ()
{
	'use strict';

	angular
		.module('app.plans', [])
		.config(config)
		.filter('parseDate',parseDateFilter);

	/** @ngInject */
	function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider, mesentitlementProvider)
	{

		mesentitlementProvider.setStateCheck("plans");

		// State
		$stateProvider.state('app.plans', {
				url    : '/plans',
				views  : {
					'plans@app': {
						templateUrl: 'app/main/plans/plans.html',
						controller : 'PlansController as vm'
					}
				},
				resolve: {
					security: ['$q','mesentitlement','$timeout','$rootScope','$state','$location', function($q,mesentitlement,$timeout,$rootScope,$state, $location){
						return $q(function(resolve, reject) {
							$timeout(function() {
								if (true) {
								// if ($rootScope.isBaseSet2) {
									resolve(function () {
										var entitledStatesReturn = mesentitlement.stateDepResolver('plans');

										mesentitlementProvider.setStateCheck("plans");

										if(entitledStatesReturn !== true){
											return $q.reject("unauthorized");
										}
									});
								} else {
									return $location.path('/guide');
								}
							});
						});
					}]
				},
				bodyClass: 'plans'
			});

		//Api
		msApiProvider.register('cc_invoice.invoices', ['app/data/cc_invoice/invoices.json']);

		// Navigation
		msNavigationServiceProvider.saveItem('plans', {
			title    : 'Plans',
			icon     : 'icon-leaf',
			state    : 'app.plans',
			/*stateParams: {
			 'param1': 'page'
			 },*/
			weight   : 6
		});
	}

	function parseDateFilter(){
		return function(input){
			return new Date(input);
		};
	}
})();
