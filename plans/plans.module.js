//////////////////////////////////////
// App : Plans						//
// Owner  : Gihan Herath			//
// Last changed date : 2018/04/17	//
// Version : 6.1.0.32				//
// Modified By : Kasun				//
//////////////////////////////////////

(function ()
{
	'use strict';

	angular
		.module('app.plan', [])
		.config(config)
		.filter('parseDate',parseDateFilter);

	/** @ngInject */
	function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider, mesentitlementProvider)
	{
		// State
		$stateProvider.state('app.plan', {
				url    : '/plan',
				views  : {
					'plan@app': {
						templateUrl: 'app/main/plans/plans.html',
						controller : 'PlansController as vm'
					}
				},
				resolve: {
					security: ['$q','mesentitlement','$timeout','$rootScope','$state','$location', function($q,mesentitlement,$timeout,$rootScope,$state, $location){
						return $q(function(resolve, reject) {
							$timeout(function() {
								// if (true) {
								if ($rootScope.isBaseSet2) {
									resolve(function () {
										var entitledStatesReturn = mesentitlement.stateDepResolver('plan');

										mesentitlementProvider.setStateCheck("plan");

										if(entitledStatesReturn !== true){
											return $q.reject("unauthorized");
										}
									});
								} else {
									return $location.path('/setupguide');
								}
							});
						});
					}]
				},
				bodyClass: 'plan'
			});

		//Api
		msApiProvider.register('cc_invoice.invoices', ['app/data/cc_invoice/invoices.json']);

		// Navigation
		msNavigationServiceProvider.saveItem('plan', {
			title    : 'Plans',
			icon     : 'icon-leaf',
			state    : 'app.plan',
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
