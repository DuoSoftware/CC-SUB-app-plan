////////////////////////////////
// App : Plans
// File : Plans Controller
// Owner  : GihanHerath
// Modified by  : Kasun
// Modified date : 2017/02/15
// Version : 6.0.1.0
/////////////////////////////////

(function ()
{
	'use strict';

	angular
		.module('app.plan')
		.controller('PlansController', PlansController);

	/** @ngInject */
	function PlansController($scope, $timeout, $mdDialog, $http, $mdMedia, $mdSidenav, $filter, $charge, $errorCheck, notifications, $azureSearchHandle, $rootScope, $interval, logHelper)
	{
		var vm = this;

		vm.appInnerState = "default";
		vm.pageTitle="Create Plan";
		vm.checked = [];
		vm.colors = ['blue-bg', 'blue-grey-bg', 'orange-bg', 'pink-bg', 'purple-bg'];

		vm.selectedPlan = {};
		vm.toggleSidenav = toggleSidenav;

		vm.responsiveReadPane = undefined;
		vm.activeInvoicePaneIndex = 0;
		vm.dynamicHeight = false;

		vm.scrollPos = 0;
		vm.scrollEl = angular.element('#content');
		vm.selectedMailShowDetails = false;

		// Methods
		vm.closeReadPane = closeReadPane;
		vm.addInvoice = toggleinnerView;
		vm.changePlans = changePlans;
		vm.billingCycleHandler = billingCycleHandler;
		vm.selectPlan = selectPlan;

		$scope.showFilers=true;
		$scope.submitPlan=submitPlan;
		$scope.plan={
			billing_cycle: "auto"
		};
		$scope.isReadLoaded;
		$scope.items = [];

		$scope.BaseCurrency = "";
		$scope.currencyRate = 1;
		// $scope.decimalPoint = 2;
		$scope.content={};
		//////////

		// Watch screen size to activate responsive read pane
		$scope.$watch(function ()
		{
			// console.log($scope.embedHovered);
			angular.element('.embed-btn').mouseenter(function () {
				// angular.element('#subscriptionPlan').addClass('embed-content');
				$scope.embedHovered = true;
			});
			angular.element('.embed-btn').mouseleave(function () {
				// angular.element('#subscriptionPlan').removeClass('embed-content');
				$scope.embedHovered = false;
			});

			// if($scope.embedFormCopied || vm.embedFormCopied){
			// 	$timeout(function(){
			// 		$scope.coppiedTimeout = vm.coppiedTimeout = true;
			// 	},2000);
			// }else{
			// 	$scope.coppiedTimeout = vm.coppiedTimeout = false;
			// }

			var embedCode = document.getElementsByClassName('embed-code');
			// if(embedCode != undefined){
			// 	angular.forEach(embedCode, function (e) {
			// 		hljs.highlightBlock(e);
			// 	});
			// }

			return $mdMedia('gt-md');
		}, function (current)
		{
			vm.responsiveReadPane = !current;
		});

		// Watch screen size to activate dynamic height on tabs
		$scope.$watch(function ()
		{
			return $mdMedia('xs');
		}, function (current)
		{
			vm.dynamicHeight = current;
		});

		function gst(name) {
			var nameEQ = name + "=";
			var ca = document.cookie.split(';');
			for (var i = 0; i < ca.length; i++) {
				var c = ca[i];
				while (c.charAt(0) == ' ') c = c.substring(1, c.length);
				if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
			}
			//debugger;
			return null;
		}

		function getDomainName() {
			var _st = gst("currentDomain");
			var __st = gst("domain");
			return (_st != null) ? _st : __st; //"248570d655d8419b91f6c3e0da331707 51de1ea9effedd696741d5911f77a64f";
		}

		function getDomainExtension() {
			var _st = gst("extension_mode");
			if(_st=="sandbox" || _st=="ssandbox"){
				_st="test";
			}
			return (_st != null) ? _st : "test"; //"248570d655d8419b91f6c3e0da331707 51de1ea9effedd696741d5911f77a64f";
		}

		/**
		 * Close read pane
		 */
		function closeReadPane() {
			if(vm.changePlanForm.$pristine && vm.changePlanForm.$dirty ){
				var confirm = $mdDialog.confirm()
					.title('Are you sure?')
					.textContent('Fields have changed and you might have unsaved data. Are you sure you want to leave this page?')
					.ariaLabel('Are you sure?')
					.targetEvent()
					.ok('Yes')
					.cancel('Stay');

				$mdDialog.show(confirm).then(function() {
					vm.changePlanForm.$pristine = false;
					vm.changePlanForm.$dirty = false;
					$scope.editOff = false;
					vm.pageTitle = "Create Plan";
				}, function() {
				});
			}else {
				$scope.editOff = false;
				vm.activePlanPaneIndex = 0;
			}

			$timeout(function ()
			{
				vm.scrollEl.scrollTop(vm.scrollPos);
			}, 650);
			$scope.showFilers=true;
		}

		/**
		 * Toggle sidenav
		 *
		 * @param sidenavId
		 */
		function toggleSidenav(sidenavId)
		{
			$mdSidenav(sidenavId).toggle();
		}

		/**
		 * Toggle innerview
		 *
		 */

		function toggleinnerView(state){
			if(vm.appInnerState === "default"){
				vm.appInnerState = "add";
				vm.pageTitle="View current plan";
				$scope.showFilers=false;
			}else{
				vm.appInnerState = "default";
				vm.pageTitle="Change Plan";
			}
		}

		function selectPlan(plan){
			$scope.openPlanLst(plan);
			vm.showFilters=false;
			$scope.showInpageReadpane = true;
			//$timeout(function ()
			//{
			//  vm.activePlanPaneIndex = 1;
			//
			//  // Store the current scrollPos
			//  vm.scrollPos = vm.scrollEl.scrollTop();
			//
			//  // Scroll to the top
			//  vm.scrollEl.scrollTop(0);
			//});
		}

		$scope.openPlanLst = function(plan) {
			//$scope.isReadLoaded = false;taxgroupcode
			$scope.inpageReadPaneEdit = false;
			$scope.planInfoLoader = [];
			$scope.isReadLoaded = false;
			vm.selectedPlan = plan;

			$scope.fullEmbededPlanForm="";
			$scope.embededFormEnabled=false;
			//vm.selectedPlan.billEvery == 'Monthly' ? vm.selectedPlan.billEvery = 'Month' : 'Year';

			vm.selectedPlan.priceScheme=[];
			$scope.clearAllPriceSchemeFeatures();

			//var priceSchemeId=plan.guPriceSchemeID;
			//if(priceSchemeId!=null && priceSchemeId!="")
			//{
			//	vm.selectedPlan.add_pricingScheme=true;
			//
			//	$charge.plan().getPriceSchemeByID(priceSchemeId).success(function(data){
			//		console.log(data);
			//		for (var i = 0; i < data.length; i++) {
			//			var priceSchemeObj=data[i];
			//			var featureObj = {};
			//
			//			if(priceSchemeObj.type=="FIXED")
			//			{
			//				featureObj.feature=priceSchemeObj.feature;
			//				featureObj.featureCode=priceSchemeObj.featureCode;
			//				featureObj.type=priceSchemeObj.type;
			//				featureObj.unitsFrom=priceSchemeObj.unitsFrom;
			//				featureObj.unitsTo=parseInt(priceSchemeObj.unitsTo);
			//				featureObj.unitUom=priceSchemeObj.unitUom;
			//				featureObj.price=parseInt(priceSchemeObj.price);
			//				featureObj.uom=priceSchemeObj.uom;
			//				featureObj.autoTermination=priceSchemeObj.autoTermination=="1"?true:false;
			//				featureObj.costPerUnitAdd=parseInt(priceSchemeObj.costPerUnitAdd);
			//
			//				featureObj.scheme = [];
			//
			//				var slabObj = {};
			//				//featureObj.productlst = angular.copy($scope.productlist);
			//				slabObj.type = "SLAB";
			//				slabObj.autoTermination = true;
			//				featureObj.scheme.push(slabObj);
			//
			//				vm.selectedPlan.priceScheme.push(featureObj);
			//			}
			//			else if(priceSchemeObj.type=="SLAB")
			//			{
			//				featureObj.feature=priceSchemeObj.feature;
			//				featureObj.featureCode=priceSchemeObj.featureCode;
			//				featureObj.type=priceSchemeObj.type;
			//				featureObj.scheme = [];
			//				var featureAddedTemp=false;
			//				for (var j = 0; j < data.length; j++) {
			//					var schemeSubObj=data[j];
			//					var schemeSubObjTemp={};
			//					if(schemeSubObj.type==featureObj.type && schemeSubObj.feature==featureObj.feature)
			//					{
			//						schemeSubObjTemp.type=schemeSubObj.type;
			//						schemeSubObjTemp.unitsFrom=parseInt(schemeSubObj.unitsFrom);
			//						schemeSubObjTemp.unitsTo=parseInt(schemeSubObj.unitsTo);
			//						schemeSubObjTemp.unitUom=schemeSubObj.unitUom;
			//						schemeSubObjTemp.price=parseInt(schemeSubObj.price);
			//						schemeSubObjTemp.uom=schemeSubObj.uom;
			//						schemeSubObjTemp.autoTermination=schemeSubObj.autoTermination=="1"?true:false;
			//						schemeSubObjTemp.costPerUnitAdd=parseInt(schemeSubObj.costPerUnitAdd);
			//
			//						featureObj.scheme.push(schemeSubObjTemp);
			//					}
			//				}
			//
			//				for (var k = 0; k < vm.selectedPlan.priceScheme.length; k++) {
			//					if(vm.selectedPlan.priceScheme[k].feature==featureObj.feature)
			//					{
			//						featureAddedTemp=true;
			//						break;
			//					}
			//				}
			//				if(!featureAddedTemp)
			//				{
			//					vm.selectedPlan.priceScheme.push(featureObj);
			//				}
			//			}
			//			else if(priceSchemeObj.type=="")
			//			{
			//				featureObj.feature=priceSchemeObj.feature;
			//				featureObj.featureCode=priceSchemeObj.featureCode;
			//				featureObj.type="optional";
			//				featureObj.unitsFrom=priceSchemeObj.unitsFrom;
			//				featureObj.unitsTo=parseInt(priceSchemeObj.unitsTo);
			//				featureObj.unitUom=priceSchemeObj.unitUom;
			//				featureObj.price=parseInt(priceSchemeObj.price);
			//				featureObj.uom=priceSchemeObj.uom;
			//				featureObj.autoTermination=priceSchemeObj.autoTermination=="1"?true:false;
			//				featureObj.costPerUnitAdd=parseInt(priceSchemeObj.costPerUnitAdd);
			//
			//				featureObj.scheme = [];
			//
			//				var slabObj = {};
			//				//featureObj.productlst = angular.copy($scope.productlist);
			//				slabObj.type = "SLAB";
			//				slabObj.autoTermination = true;
			//				featureObj.scheme.push(slabObj);
			//
			//				vm.selectedPlan.priceScheme.push(featureObj);
			//			}
			//
			//		}
			//		$scope.isReadLoaded = true;
			//
			//	}).error(function(data){
			//		//
			//		console.log(data);
			//		$scope.isReadLoaded = true;
			//	})
			//}
			//else
			//{
			//	$scope.addNewRow(vm.selectedPlan.priceScheme);
			//	vm.selectedPlan.add_pricingScheme=false;
			//	$scope.isReadLoaded = true;
			//}

			$scope.selectedBasePlans=[];
			$scope.clearBasePlanList();
			$scope.clearAddonPlanList();
			$charge.plan().getPlanByCode(plan.code).success(function(data){
				//console.log(data);
				vm.selectedPlan=data;
				vm.selectedPlanName = data.name;
				if(data.basePlanCodes!=undefined)
				{
					for (var l = 0; l < data.basePlanCodes.length; l++) {
						//$scope.selectedBasePlans.push({
						//  code : data.basePlanCodes[l]
						//});
						for (var i = 0; i < $scope.basePlanList.length; i++) {
							if($scope.basePlanList[i].code==data.basePlanCodes[l])
							{
								$scope.basePlanList[i].isSelected=true;
							}
						}
					}
				}

				if(data.addOnCodes!=undefined)
				{
					for (var l = 0; l < data.addOnCodes.length; l++) {
						//$scope.selectedBasePlans.push({
						//  code : data.basePlanCodes[l]
						//});
						for (var i = 0; i < $scope.addonPlanList.length; i++) {
							if($scope.addonPlanList[i].code==data.addOnCodes[l])
							{
								$scope.addonPlanList[i].isSelected=true;
							}
						}
					}
				}

				$charge.tax().getTaxGrpByIDs(vm.selectedPlan.taxID).success(function(data) {
					var taxid=data.groupDetail[0].taxid;
					$charge.tax().getTaxByIDs(taxid).success(function(data) {
						vm.selectedPlan.taxType = data[0].amounttype;
						vm.selectedPlan.taxAmount = data[0].amount;
					}).error(function(data) {
						//console.log(data);
						//vm.selectedPlan = plan;
						vm.selectedPlan.taxType = "-1";
						vm.selectedPlan.taxAmount = 0;
					})
				}).error(function(data) {
					//console.log(data);
					//vm.selectedPlan = plan;
					vm.selectedPlan.taxType = "-1";
					vm.selectedPlan.taxAmount = 0;

					$scope.infoJson= {};
					$scope.infoJson.message =JSON.stringify(data);
					$scope.infoJson.app ='plans';
					logHelper.error( $scope.infoJson);
				});

				$scope.selectedPlanFeaturesList = [];
				if(data.priceScheme.length>0)
				{
					vm.selectedPlan.add_pricingScheme=true;

					for (var i = 0; i < data.priceScheme.length; i++) {
						for (var j = 0; j < $scope.priceSchemeFeatureList.length; j++) {
							if($scope.priceSchemeFeatureList[j][0].featureCode==data.priceScheme[i].featureCode)
							{
								$scope.priceSchemeFeatureList[j].isSelected=true;
								$scope.selectedPlanFeaturesList.push($scope.priceSchemeFeatureList[j][0]);
								break;
							}
						}
					}
					$scope.isReadLoaded = true;
				}
				else
				{
					vm.selectedPlan.add_pricingScheme=false;
					$scope.isReadLoaded = true;
				}

			}).error(function(data){
				//basePlanCodes
				//console.log(data);
			})

		};

		function changePlans(){
			toggleinnerView('add');
		}

		function submit(){
			toggleinnerView('add');
		}

		$charge.settingsapp().getDuobaseFieldDetailsByTableNameAndFieldName("CTS_GeneralAttributes","BaseCurrency").success(function(data) {
			$scope.BaseCurrency=data[0].RecordFieldData;
			//$scope.selectedCurrency = $scope.BaseCurrency;

		}).error(function(data) {
			//console.log(data);
			$scope.BaseCurrency="USD";
			//$scope.selectedCurrency = $scope.BaseCurrency;
		})

		$scope.prefferedCurrencies=[];
		$charge.settingsapp().getDuobaseFieldDetailsByTableNameAndFieldName("CTS_GeneralAttributes","FrequentCurrencies").success(function(data) {
			$scope.prefferedCurrencies=data[0].RecordFieldData.trimLeft().split(" ");
		}).error(function(data) {
			//console.log(data);
		})

		$scope.planTypeList=[];
		$charge.settingsapp().getDuobaseFieldsByTableNameAndFieldName("CTS_PlanAttributes", "PlanType").success(function (data) {
			var length = data.length;
			// debugger;
			$scope.planTypeList=[];
			for (var i = 0; i < length; i++) {
				for (var j = 0; j < data[i].length; j++) {
					var obj = data[i][j];
					if (obj.ColumnIndex == "0") {
						$scope.planTypeList.push(obj);

					}
				}
			}
		}).error(function (data) {
		})

		$charge.settingsapp().getDuobaseValuesByTableName("CTS_GeneralAttributes").success(function(data) {
			$scope.decimalPoint = parseInt(data[6].RecordFieldData);
		}).error(function (data) {

		});
		$scope.taxGroup=[];
		var skipGrp= 0,takeGrp=100;

		$charge.tax().allgroups(skipGrp,takeGrp,"asc").success(function(data) {
			//
			skipGrp += takeGrp;
			//console.log(data);
			//if($scope.loading) {
			// returned data contains an array of 2 sentences
			for (var i = 0; i < data.length; i++) {
				$scope.taxGroup.push(data[i]);

			}
		}).error(function(data) {
			//console.log(data);
			$scope.infoJson= {};
			$scope.infoJson.message =JSON.stringify(data);
			$scope.infoJson.app ='plans';
			logHelper.error( $scope.infoJson);
		})

		function billingCycleHandler(selection){
			if(selection=='fixed'){
				$scope.showNoOfCycles = true;
			}else{
				$scope.showNoOfCycles = false;
			}
		}

		$scope.$watch(function () {
			var elem = document.querySelector('#billingFrqCurrency');
			var elem2 = document.querySelector('#billingFrqCurrencyEdit');
			if(elem != null){
				if(elem.innerText != ""){
					var innerCurr = elem.innerText.split('0')[0];
					document.querySelector('#billingFrqCurrency').innerText = innerCurr;
				}
			}
			if(elem2 != null) {
				if (elem2.innerText != "") {
					var innerCurr2 = elem2.innerText.split('0')[0];
					document.querySelector('#billingFrqCurrencyEdit').innerText = innerCurr2;
				}
			}
			vm.planContentHeight = window.innerHeight - 145;
		});

		$scope.updateScroll = function (state) {
			var elem3 = document.getElementById('createPlanContent');
			var elem4 = document.getElementById('updatePlanContent');
			if(elem3 != undefined && state == 'create'){
				$timeout(function(){
					elem3.scrollTop = elem3.scrollHeight;
				});
			}
			if(elem4 != undefined && state == 'edit'){
				$timeout(function(){
					elem4.scrollTop = elem4.scrollHeight;
				});
			}
		};

		$scope.toggleEdit = function (planType) {

			// if($scope.editOff==true)
			// {
			// 	if(vm.changePlanForm.$pristine && vm.changePlanForm.$dirty ){
			// 		var confirm = $mdDialog.confirm()
			// 			.title('Are you sure?')
			// 			.textContent('Fields have changed and you might have unsaved data. Are you sure you want to leave this page?')
			// 			.ariaLabel('Are you sure?')
			// 			.targetEvent()
			// 			.ok('Yes')
			// 			.cancel('Stay');
			//
			// 		$mdDialog.show(confirm).then(function() {
			// 			vm.changePlanForm.$pristine = false;
			// 			vm.changePlanForm.$dirty = false;
			// 			$scope.editOff = false;
			// 			vm.pageTitle = "Create Plan";
			// 		}, function() {
			// 		});
			// 	}else {
			// 		$scope.editOff = false;
			// 		vm.pageTitle = "Create Plan";
			// 	}
			// 	vm.activePlanPaneIndex = 0;
			// }
			// else
			// {
			$scope.editOff = true;
			vm.pageTitle = "View Plan";
			$scope.selectedBasePlans=[];
			$scope.selectedPlanFeaturesList=[];
			$scope.loadAllPriceSchemeFeatures();
			$scope.clearBasePlanList();
			$scope.clearAddonPlanList();
			//skip=0;
			//$scope.items = [];
			//$scope.more();
			$scope.content.type = planType;
			vm.activePlanPaneIndex = 1;
			$scope.showInpageReadpane = false;
			$scope.selectMultiplePlansForEmbedForm = false;
			// }
		};

		$scope.sortBy = function(propertyName,status,property) {
			if(propertyName == 'unitPrice'){
				angular.forEach(vm.plans, function (plan) {
					plan.unitPrice = parseInt(plan.unitPrice);
				});
			}
			vm.plans=$filter('orderBy')(vm.plans, propertyName, $scope.reverse);
			$scope.reverse =!$scope.reverse;

			if(status!=null) {
				if(property=='Name')
				{
					$scope.showName = status;
					$scope.showCode = false;
					$scope.showDate = false;
					$scope.showPrice = false;
					$scope.showState = false;
				}
				if(property=='Code')
				{
					$scope.showName = false;
					$scope.showCode = status;
					$scope.showDate = false;
					$scope.showPrice = false;
					$scope.showState = false;
				}
				if(property=='Date')
				{
					$scope.showName = false;
					$scope.showCode = false;
					$scope.showDate = status;
					$scope.showPrice = false;
					$scope.showState = false;
				}
				if(property=='Price')
				{
					$scope.showName = false;
					$scope.showCode = false;
					$scope.showDate = false;
					$scope.showPrice = status;
					$scope.showState = false;
				}
				if(property=='Status')
				{
					$scope.showName = false;
					$scope.showCode = false;
					$scope.showDate = false;
					$scope.showPrice = false;
					$scope.showState = status;
				}
			}
		};

		$scope.showMoreUserInfo=false;
		$scope.contentExpandHandler = function () {
			$scope.reverseMoreLess =! $scope.reverseMoreLess;
			if($scope.reverseMoreLess){
				$scope.showMoreUserInfo=true;
			}else{
				$scope.showMoreUserInfo=false;
			}
		};

		$scope.showInpageReadpane = false;
		$scope.switchInfoPane = function (state, plan) {
			if($scope.selectMultiplePlansForEmbedForm){
				plan.selectForEmbed = !plan.selectForEmbed;
			}else {
				if (state == 'show') {
					$scope.showInpageReadpane = true;
					$scope.editOff = false;
					$scope.showEmbedForm = false;
					$scope.$watch(function () {
						//vm.selectedPlan = plan;
					});
					$scope.openPlanLst(plan);
				} else if (state == 'close') {
					if ($scope.inpageReadPaneEdit) {
						$scope.cancelEdit();
						vm.selectedPlan = $scope.tempEditPlan;
					} else {
						$scope.showInpageReadpane = false;
						$scope.inpageReadPaneEdit = false;
					}
				}
			}
		}

		$scope.tempEditPlan=[];
		$scope.editPlan = function (plan) {
			$scope.tempEditPlan=angular.copy(plan);
			vm.editSelectedPlan = plan;
			//debugger;
			if(vm.editSelectedPlan.addOnCodes != undefined){
				if(vm.editSelectedPlan.addOnCodes.length > 0){
					vm.editSelectedPlan.add_addons = true;
				}
			}
			vm.editSelectedPlan.rate = parseInt(plan.rate);
			vm.editSelectedPlan.unitPrice = parseInt(plan.unitPrice);
			vm.editSelectedPlan.billingInterval = parseInt(plan.billingInterval);
			vm.editSelectedPlan.billingCycle = parseFloat(plan.billingCycle);
			vm.editSelectedPlan.trailDays = parseInt(plan.trailDays);
			if(vm.editSelectedPlan.billingCycle == -1){
				vm.editSelectedPlan.billingCycleType = "auto";
			}
			else{
				vm.editSelectedPlan.billingCycleType = "fixed";
			}

			if(vm.editSelectedPlan.taxID!=null && vm.editSelectedPlan.taxID!="" && vm.editSelectedPlan.taxID!=undefined)
			{
				vm.editSelectedPlan.apply_tax=true;
			}

			//if(vm.editSelectedPlan.add_pricingScheme){
			//	angular.forEach(vm.editSelectedPlan.priceScheme, function(scheme){
			//		if(scheme.type=='optional')
			//		{
			//			scheme.advancedFeaturesConfirmed = false;
			//			scheme.showAdvanceFeatures = false;
			//		}
			//		else
			//		{
			//			scheme.advancedFeaturesConfirmed = true;
			//			scheme.showAdvanceFeatures = true;
			//		}
			//	});
			//}

			$scope.inpageReadPaneEdit=true;
		};
		$scope.cancelEdit = function () {
			vm.editPlanForm.$pristine = false;
			vm.editPlanForm.$dirty = false;
			$scope.inpageReadPaneEdit=false;
			$scope.clearform("");
		}

		$scope.showDeactivatePlanConfirm = function(ev,plan) {
			// Appending dialog to document.body to cover sidenav in docs app
			var confirm = $mdDialog.confirm()
				.title('Would you like to deactivate this Plan?')
				.textContent('You cannot revert this action again for a active Plan!')
				.ariaLabel('Lucky day')
				.targetEvent(ev)
				.ok('Please do it!')
				.cancel('No!');

			$mdDialog.show(confirm).then(function() {
				$scope.removePlan(plan);
			}, function() {

			});
		};

		$scope.removePlan = function (plan) {
			var guid=plan.guPlanID;

			$charge.plan().inactivePlan(guid).success(function(data){
				if(data.Result==true) {
					notifications.toast("Plan Deactivated", "success");

					$scope.infoJson= {};
					$scope.infoJson.message =plan.guPlanID+' Plan Deactivated';
					$scope.infoJson.app ='plans';
					logHelper.info( $scope.infoJson);

					skip = 0;
					$scope.items = [];
					$scope.loading=true;
					$scope.more(plan,"");
				}
			}).error(function(data){
				//
				notifications.toast(data,"error");
				//console.log(data);
				$scope.infoJson= {};
				$scope.infoJson.message =plan.guPlanID+' Plan Deactivate Failed';
				$scope.infoJson.app ='plans';
				logHelper.error( $scope.infoJson);
			})
		}

		$scope.showActivatePlanConfirm = function(ev,plan) {
			// Appending dialog to document.body to cover sidenav in docs app
			var confirm = $mdDialog.confirm()
				.title('Would you like to Activate this Plan?')
				.textContent('You cannot revert this action again for a inactive Plan!')
				.ariaLabel('Lucky day')
				.targetEvent(ev)
				.ok('Please do it!')
				.cancel('No!');

			$mdDialog.show(confirm).then(function() {
				$scope.activatePlan(plan);
			}, function() {

			});
		};

		$scope.activatePlan = function (plan) {
			var guid=plan.guPlanID;

			$charge.plan().activatePlan(guid).success(function(data){
				if(data.Result==true) {
					notifications.toast("Plan Activated", "success");

					$scope.infoJson= {};
					$scope.infoJson.message =plan.guPlanID+' Plan Activated';
					$scope.infoJson.app ='plans';
					logHelper.info( $scope.infoJson);

					skip = 0;
					$scope.items = [];
					$scope.loading=true;
					$scope.more(plan,"");
				}
			}).error(function(data){
				//
				notifications.toast(data,"error");
				//console.log(data);relupan@10vpn.info
				$scope.infoJson= {};
				$scope.infoJson.message =plan.guPlanID+' Plan Activate Failed';
				$scope.infoJson.app ='plans';
				logHelper.error( $scope.infoJson);
			})
		}

		$scope.isLoading = true;
		$scope.isdataavailable=true;
		$scope.hideSearchMore=false;

		var skip=0;
		var take=100;
		$scope.loading = true;

		$scope.more = function(selectedPlan, status){

			$scope.isLoading = true;
			//$charge.plan().allPlans(skip,take,'desc',status).success(function(data)
			//{
			//	console.log(data);
			//
			//	if($scope.loading)
			//	{
			//		skip += take;
			//
			//		for (var i = 0; i < data.length; i++) {
			//			$scope.items.push(data[i]);
			//		}
			//		vm.plans=$scope.items;
			//		//$timeout(function () {
			//		//  vm.plans=$scope.items;
			//		//},0);bofoxoc@evyush.com/dimezif@12hosting.net
			//		vm.searchMoreInit = false;
			//
			//		$scope.isLoading = false;
			//		$scope.loading = false;
			//		$scope.isdataavailable=true;
			//		if(data.length<take){
			//			$scope.isdataavailable=false;
			//			$scope.hideSearchMore=true;
			//		}
			//
			//	}
			//
			//}).error(function(data)
			//{
			//	console.log(data);
			//	$scope.isSpinnerShown=false;
			//	$scope.isdataavailable=false;
			//	$scope.loading = false;
			//	$scope.isLoading = false;
			//	$scope.hideSearchMore=true;
			//})

			//	var dbNamePart1="";
			//	var dbNamePart2="";
			//	var dbName="";
			//	var filter="";
			//var data={};
			//	dbNamePart1=getDomainName().split('.')[0];
			//	dbNamePart2=getDomainExtension();
			//	dbName=dbNamePart1+"_"+dbNamePart2;
			//	//filter="api-version=2016-09-01&?search=*&$orderby=createdDate desc&$skip="+skip+"&$top="+take+"&$filter=(domain eq '"+dbName+"')";
			//
			//if(status=="")
			//{
			//  data={
			//    "search": "*",
			//    "filter": "(domain eq '"+dbName+"')",
			//    "orderby" : "createdDate desc",
			//    "top":take,
			//    "skip":skip
			//  }
			//}
			//else
			//{
			//  data={
			//    "search": "*",
			//    "filter": "(domain eq '"+dbName+"' and status eq '"+status+"')",
			//    "orderby" : "createdDate desc",
			//    "top":take,
			//    "skip":skip
			//  }
			//}
			//
			//$charge.azuresearch().getAllPlansPost(data).success(function(data)
			//{
			//  //console.log(data);
			//
			//  if($scope.loading)
			//  {
			//    skip += take;
			//
			//    for (var i = 0; i < data.value.length; i++) {
			//      $scope.items.push(data.value[i]);
			//    }
			//    $scope.$watch(function () {
			//      vm.plans=$scope.items;
			//    });
			//    //$timeout(function () {
			//    //  vm.plans=$scope.items;
			//    //},0);bofoxoc@evyush.com/dimezif@12hosting.net
			//    vm.searchMoreInit = false;
			//
			//    $scope.isLoading = false;
			//    $scope.loading = false;
			//    $scope.isdataavailable=true;
			//
			//    if(selectedPlan!="")
			//    {
			//      selectPlan(selectedPlan);
			//    }
			//
			//    if(data.value.length<take){
			//      $scope.isdataavailable=false;
			//      $scope.hideSearchMore=true;
			//    }
			//
			//  }
			//
			//}).error(function(data)
			//{
			//  //console.log(data);
			//  $scope.isSpinnerShown=false;
			//  $scope.isdataavailable=false;
			//  $scope.loading = false;
			//  $scope.isLoading = false;
			//  $scope.hideSearchMore=true;
			//})

			$azureSearchHandle.getClient().SearchRequest("plan",skip,take,'desc',status).onComplete(function(Response)
			{
				if($scope.loading)
				{
					skip += take;

					for (var i = 0; i < Response.length; i++) {
						Response[i].createdDate = $filter('date')(new Date(Response[i].createdDate), 'yyyy-MM-dd', false);
						Response[i].selectForEmbed = false;
						$scope.items.push(Response[i]);
					}
					$timeout(function () {
						vm.plans = $scope.items;
					});
					//$timeout(function () {
					//  vm.plans=$scope.items;
					//},0);bofoxoc@evyush.com/dimezif@12hosting.net
					vm.searchMoreInit = false;

					$scope.isLoading = false;
					$scope.loading = false;
					$scope.isdataavailable=true;

					if(selectedPlan!="")
					{
						selectPlan(selectedPlan);
					}

					if(Response.length<take){
						$scope.isdataavailable=false;
						$scope.hideSearchMore=true;
					}

				}

			}).onError(function(data)
			{
				//console.log(data);
				$scope.isSpinnerShown=false;
				$scope.isdataavailable=false;
				$scope.loading = false;
				$scope.isLoading = false;
				$scope.hideSearchMore=true;

				$scope.infoJson= {};
				$scope.infoJson.message =JSON.stringify(data);
				$scope.infoJson.app ='plans';
				logHelper.error( $scope.infoJson);
			});

		};
		// we call the function twice to populate the list
		$scope.more("","");

		$scope.applyFilters = function (filter){
			skip=0;
			vm.plans=[];
			$scope.items = [];
			$scope.loading=true;
			$scope.more("",filter);
		}

		var skipBasePlans=0;
		var takeBasePlans=100;
		$scope.loadingBasePlans = true;
		$scope.basePlanList=[];
		$scope.loadAllBasePlans= function () {
			$charge.plan().allBasePlans(skipBasePlans,takeBasePlans,'desc').success(function(data)
			{
				//console.log(data);

				if($scope.loadingBasePlans)
				{
					skipBasePlans += takeBasePlans;

					for (var i = 0; i < data.length; i++) {
						data[i].isSelected=false;
						$scope.basePlanList.push(data[i]);
					}

					$scope.loadingBasePlans = false;

					if(data.length<takeBasePlans){

					}
					else
					{
						$scope.loadingBasePlans = true;
						$scope.loadAllBasePlans();
					}

				}

			}).error(function(data)
			{
				$scope.loadingBasePlans = false;

				$scope.infoJson= {};
				$scope.infoJson.message =JSON.stringify(data);
				$scope.infoJson.app ='plans';
				logHelper.error( $scope.infoJson);
			})
		}
		$scope.loadAllBasePlans();

		var skipAddonPlans=0;
		var takeAddonPlans=100;
		$scope.loadingAddonPlans = true;
		$scope.addonPlanList=[];
		$scope.loadAllAddonPlans= function () {
			$charge.plan().allAddonPlans(skipAddonPlans,takeAddonPlans,'desc').success(function(data)
			{
				//console.log(data);

				if($scope.loadingAddonPlans)
				{
					skipAddonPlans += takeAddonPlans;

					for (var i = 0; i < data.length; i++) {
						data[i].isSelected=false;
						$scope.addonPlanList.push(data[i]);
					}

					$scope.loadingAddonPlans = false;

					if(data.length<takeAddonPlans){

					}
					else
					{
						$scope.loadingAddonPlans = true;
						$scope.loadAllAddonPlans();
					}

				}

			}).error(function(data)
			{
				$scope.loadingAddonPlans = false;

				$scope.infoJson= {};
				$scope.infoJson.message =JSON.stringify(data);
				$scope.infoJson.app ='plans';
				logHelper.error( $scope.infoJson);
			})
		}
		$scope.loadAllAddonPlans();

		$scope.loadingPriceSchemeFeatures = true;
		$scope.priceSchemeFeatureList=[];
		$scope.selectedPlanFeaturesList=[];
		$scope.loadAllPriceSchemeFeatures= function () {
			$scope.priceSchemeFeatureList=[];
			$scope.loadingPriceSchemeFeatures = true;
			$charge.plan().allFeatures().success(function(data)
			{
				//console.log(data);

				if($scope.loadingPriceSchemeFeatures)
				{

					//for (var i = 0; i < data.length; i++) {
					//  data[i].isSelected=false;
					//  for (var j = 0; j < $scope.selectedPlanFeaturesList.length; j++) {
					//    if($scope.selectedPlanFeaturesList[j].featureCode==data[i][0].featureCode)
					//    {
					//      data[i].isSelected=true;
					//      break;
					//    }
					//  }
					//  $scope.priceSchemeFeatureList.push(data[i]);
					//}
					angular.forEach(data, function(scheme){
						scheme.isSelected=false;
						for (var i = 0; i < $scope.selectedPlanFeaturesList.length; i++) {
							if($scope.selectedPlanFeaturesList[i].featureCode==scheme[0].featureCode)
							{
								scheme.isSelected=true;
								break;
							}
						}
						$scope.priceSchemeFeatureList.push(scheme);
					});

					$scope.loadingPriceSchemeFeatures = false;

				}

			}).error(function(data)
			{
				$scope.loadingPriceSchemeFeatures = false;

				$scope.infoJson= {};
				$scope.infoJson.message =JSON.stringify(data);
				$scope.infoJson.app ='plans';
				logHelper.error( $scope.infoJson);
			})
		}
		$scope.loadAllPriceSchemeFeatures();

		$scope.clearAllPriceSchemeFeatures= function () {
			for (var i = 0; i < $scope.priceSchemeFeatureList.length; i++) {
				$scope.priceSchemeFeatureList[i].isSelected=false;
			}
		}

		$scope.clearBasePlanList= function () {
			for (var i = 0; i < $scope.basePlanList.length; i++) {
				$scope.basePlanList[i].isSelected=false;
			}
		}

		$scope.clearAddonPlanList= function () {
			for (var i = 0; i < $scope.addonPlanList.length; i++) {
				$scope.addonPlanList[i].isSelected=false;
			}
		}

		$scope.getCatLetter=function(catName) {
			try{
				var catogeryLetter = "app/core/cloudcharge/img/material_alperbert/avatar_tile_"+catName.charAt(0).toLowerCase()+"_28.png";
			}catch(exception){}
			return catogeryLetter;
		};

		$scope.selectedBasePlans=[];
		//$scope.loadUiShareData=[];

		$scope.onDropOne = function (data, event) {
			//console.log(data);

			// Get custom object data.
			var customObjectData= data['json/custom-object']; // {foo: 'bar'}

			$scope.setcustomObjectData={};
			$scope.setcustomObjectData=customObjectData;
			//$scope.setcustomObjectData.id=customObjectData.id;
			$scope.setcustomObjectData.image="app/core/cloudcharge/img/user.png";
			//$scope.setcustomObjectData.displayName=customObjectData.displayName;
			//$scope.setcustomObjectData.mail=customObjectData.mail;

			//console.log($scope.setcustomObjectData);
			// Get other attached data.
			var uriList = data['text/uri-list'];
			// console.log(uriList);

			for (var ind in $scope.selectedBasePlans)
			{
				//console.log($scope.selectedBasePlans[ind].code);

				if($scope.selectedBasePlans[ind].code == $scope.setcustomObjectData.code)
				{
					$scope.selectedBasePlans.splice(ind,1);
				}
			}
			$scope.selectedBasePlans.push($scope.setcustomObjectData);

		};

		$scope.deleteSelectedBasePlan= function(ev, data){
			//console.log(data);
			for (var ind in $scope.selectedBasePlans)
			{
				//console.log($scope.selectedBasePlans[ind].code);

				if($scope.selectedBasePlans[ind].code == data.code)
				{
					$scope.selectedBasePlans.splice(ind,1);
					//console.log($scope.selectedBasePlans);
				}
			}
		};

		$scope.clearform = function (planType){
			$scope.content={};
			if(planType!="")
			{
				$scope.content.type=planType;
			}
			vm.editSelectedPlan={};
			$scope.content.billingCycleType="auto";
			$scope.content.trailDays=30;
			billingCycleHandler("auto");
		}

		$scope.UOMs = [];
		$scope.getAllUOM = function (){
			$charge.uom().getAllUOM('Plan_123').success(function (data) {
				$scope.UOMs = [];
				//
				//console.log(data);
				for (var i = 0; i < data.length; i++) {
					//
					$scope.UOMs.push(data[i]);
					//
				}
				//$mdDialog.hide($scope.UOMs);
			}).error(function (data) {
				//console.log(data);
				$scope.infoJson= {};
				$scope.infoJson.message =JSON.stringify(data);
				$scope.infoJson.app ='plans';
				logHelper.error( $scope.infoJson);
			})
		}
		$scope.getAllUOM();


		//$scope.features=[];
		vm.features={};

		$scope.openFeatureDialog = function (mode, feature) {
			if(mode=="Add")
			{
				$scope.addNewRow(vm.features);
			}
			else if(mode=="Update")
			{
				//$scope.addNewRow(vm.features);
				var priceSchemeObj=feature;
				var featureObj = {};

				if(priceSchemeObj[0].type=="FIXED")
				{
					featureObj.feature=priceSchemeObj[0].feature;
					featureObj.featureCode=priceSchemeObj[0].featureCode;
					featureObj.type=priceSchemeObj[0].type;
					featureObj.unitsFrom=parseInt(priceSchemeObj[0].unitsFrom);
					featureObj.unitsTo=parseInt(priceSchemeObj[0].unitsTo);
					featureObj.unitUom=priceSchemeObj[0].unitUom;
					featureObj.price=parseInt(priceSchemeObj[0].price);
					featureObj.uom=priceSchemeObj[0].uom;
					featureObj.autoTermination=priceSchemeObj[0].autoTermination=="1"?true:false;
					featureObj.costPerUnitAdd=parseInt(priceSchemeObj[0].costPerUnitAdd);

					featureObj.scheme = [];

					var slabObj = {};
					//featureObj.productlst = angular.copy($scope.productlist);
					slabObj.type = "SLAB";
					slabObj.autoTermination = true;
					featureObj.scheme.push(slabObj);

					vm.features=featureObj;
				}
				else if(priceSchemeObj[0].type=="SLAB")
				{
					featureObj.feature=priceSchemeObj[0].feature;
					featureObj.featureCode=priceSchemeObj[0].featureCode;
					featureObj.type=priceSchemeObj[0].type;

					featureObj.scheme = [];
					for (var i = 0; i < priceSchemeObj.length; i++) {
						var slabObj = {};
						slabObj.type = "SLAB";
						slabObj.unitsFrom = parseInt(priceSchemeObj[i].unitsFrom);
						slabObj.unitsTo = parseInt(priceSchemeObj[i].unitsTo);
						slabObj.unitUom = priceSchemeObj[i].unitUom;
						slabObj.price = parseInt(priceSchemeObj[i].price);
						slabObj.uom = priceSchemeObj[i].uom;
						slabObj.autoTermination = priceSchemeObj[i].autoTermination=="1"?true:false;
						slabObj.costPerUnitAdd = parseInt(priceSchemeObj[i].costPerUnitAdd);
						featureObj.scheme.push(slabObj);
					}

					vm.features=featureObj;
				}
				else
				{
					featureObj.feature=priceSchemeObj[0].feature;
					featureObj.featureCode=priceSchemeObj[0].featureCode;
					featureObj.type="optional";
					featureObj.unitsFrom=priceSchemeObj[0].unitsFrom;
					featureObj.unitsTo=parseInt(priceSchemeObj[0].unitsTo);
					featureObj.unitUom=priceSchemeObj[0].unitUom;
					featureObj.price=parseInt(priceSchemeObj[0].price);
					featureObj.uom=priceSchemeObj[0].uom;
					featureObj.autoTermination=true;
					featureObj.costPerUnitAdd=parseInt(priceSchemeObj[0].costPerUnitAdd);

					featureObj.scheme = [];

					var slabObj = {};
					//featureObj.productlst = angular.copy($scope.productlist);
					slabObj.type = "SLAB";
					slabObj.autoTermination = true;
					featureObj.scheme.push(slabObj);

					vm.features=featureObj;
				}
			}

			$mdDialog.show({
				controller: 'AddFeaturesController as vm',
				templateUrl: 'app/main/plans/dialogs/features/addFeature.html',
				targetEvent: this,
				clickOutsideToClose:false,
				locals: {
					features: vm.features,
					uoms: $scope.UOMs,
					mode: mode
				}
			}).then(function(answer) {
				$scope.loadAllPriceSchemeFeatures();
				$scope.getAllUOM();
			}, function() {

			});
		};

		$scope.showDeleteFeatureConfirm = function (ev,row) {
			// Appending dialog to document.body to cover sidenav in docs app
			var confirm = $mdDialog.confirm()
				.title('Would you like to delete this Feature?')
				.textContent('Caution: This Feature will be removed from the Plans that linked with this feature!')
				.ariaLabel('Lucky day')
				.targetEvent(ev)
				.ok('Please do it!')
				.cancel('No!');

			$mdDialog.show(confirm).then(function() {
				$scope.deleteFeature(row);
			}, function() {

			});
		};

		$scope.deleteFeature=function(rowname){
			var featureCode=rowname[0].featureCode;
			$charge.plan().removeFeature(featureCode).success(function(data){
				//console.log(data);
				if(data.response=="succeeded")
				{
					notifications.toast("Successfully Feature removed","success");
					$scope.loadAllPriceSchemeFeatures();

					$scope.infoJson= {};
					$scope.infoJson.message =featureCode+' Successfully Feature removed';
					$scope.infoJson.app ='plans';
					logHelper.info( $scope.infoJson);
				}
				else
				{
					notifications.toast("Feature removing Failed","error");

					$scope.infoJson= {};
					$scope.infoJson.message =featureCode+' Feature remove Failed';
					$scope.infoJson.app ='plans';
					logHelper.error( $scope.infoJson);
				}
			}).error(function(data) {
				//console.log(data);
				notifications.toast("Feature removing Failed","error");

				$scope.infoJson= {};
				$scope.infoJson.message =featureCode+' Feature remove Failed';
				$scope.infoJson.app ='plans';
				logHelper.error( $scope.infoJson);
			});
		}

		$scope.addNewRow=function(rowname) {

			var featureObj = {};
			//featureObj.productlst = angular.copy($scope.productlist);
			//product.qty=0;
			featureObj.type = "optional";
			//featureObj.feature = "optional";
			featureObj.unitsFrom = "0";
			featureObj.autoTermination = true;

			featureObj.scheme = [];

			var slabObj = {};
			//featureObj.productlst = angular.copy($scope.productlist);
			slabObj.type = "SLAB";
			slabObj.autoTermination = true;
			featureObj.scheme.push(slabObj);

			//rowname.push(featureObj);
			vm.features=featureObj;
		}

		$scope.addNewSlab=function(slab) {

			var slabObj = {};
			//featureObj.productlst = angular.copy($scope.productlist);
			slabObj.type = "SLAB";
			slabObj.autoTermination = true;
			slab.scheme.push(slabObj);
		}

		//$scope.addNewRow($scope.features);

		$scope.removerow = function (index,rowname,parentIndex) {
			if(rowname == $scope.features)
			{
				if($scope.features.length!=1)
				{
					$scope.features.splice(index, 1);
					$scope.calcUnitPrice($scope.features,$scope.content.unitPrice,$scope.content.default_price,$scope.content.add_pricingScheme,'add');
				}
			}
			else if($scope.features[parentIndex] && rowname == $scope.features[parentIndex].scheme)
			{
				if(rowname.length!=1)
				{
					rowname.splice(index, 1);
					$scope.calcUnitPrice($scope.features,$scope.content.unitPrice,$scope.content.default_price,$scope.content.add_pricingScheme,'add');
				}
			}
			else if(rowname == vm.selectedPlan.priceScheme)
			{
				if(vm.selectedPlan.priceScheme.length!=1)
				{
					vm.selectedPlan.priceScheme.splice(index, 1);
					$scope.calcUnitPrice(vm.editSelectedPlan.priceScheme,vm.editSelectedPlan.unitPrice,vm.editSelectedPlan.default_price,vm.editSelectedPlan.add_pricingScheme,'update');
				}
			}
			else if(vm.selectedPlan.priceScheme[parentIndex] && rowname == vm.selectedPlan.priceScheme[parentIndex].scheme)
			{
				if(rowname.length!=1)
				{
					rowname.splice(index, 1);
					$scope.calcUnitPrice(vm.editSelectedPlan.priceScheme,vm.editSelectedPlan.unitPrice,vm.editSelectedPlan.default_price,vm.editSelectedPlan.add_pricingScheme,'update');
				}
			}
			//rowname.splice(index, 1);
			//self1.searchText.splice(index,1);

		}
		$scope.featureType='';
		$scope.setFeature = function (row, type) {
			// row.advancedFeaturesConfirmed = true;
			$scope.advancedFeaturesConfirmed = true;
			// type == 'FIXED' ? row.type = 'FIXED' : row.type='SLAB';
			type == 'FIXED' ? $scope.featureType = 'FIXED' : $scope.featureType='SLAB';
			var elem = document.getElementsByClassName('content-wrapper')[0];
			elem.scrollTop = elem.scrollHeight - elem.clientHeight;
		}

		$scope.setAdvanceFeatures=function(row) {
			// row.showAdvanceFeatures=true;
			$scope.showAdvanceFeatures = true;
			// angular.element('#createFeatureType').triggerHandler('click');
		}

		$scope.closeAdvanceFeatures=function(row) {
			// row.showAdvanceFeatures=false;
			// row.advancedFeaturesConfirmed = false;
			// row.type = "optional";

			$scope.showAdvanceFeatures=false;
			$scope.advancedFeaturesConfirmed = false;
			$scope.featureType = "optional";

		}

		// Kasun_Wijeratne_8_5_2017
		$scope.embedHovered = false;
		$scope.closeEmbedForm = function () {
			$scope.embedFormCopied = false;
			window.getSelection().empty();
			$scope.showEmbedForm = false;
			vm.clearSelectedEmbed();
		}
		$scope.embedFormCopied = false;

		vm.copyStarted = false;
		$scope.copyToClipboard = vm.copyToClipboard = function (elem) {
			if(elem == 'embededCodeURL'){
				vm.urlCopied = true;
				vm.iframeCopied = false;
			}else{
				vm.urlCopied = false;
				vm.iframeCopied = true;
			}
			vm.copyStarted = true;
			window.getSelection().empty();
			var copyField = document.getElementById(elem);
			var range = document.createRange();
			range.selectNode(copyField);
			window.getSelection().addRange(range);
			document.execCommand('copy');
			$timeout(function(){
				vm.copyStarted = false;
				vm.urlCopied = false;
				vm.iframeCopied = false;
			},2000);

			// window.getSelection().empty();
			// var copyField = document.getElementById('embededCode');
			// var range = document.createRange();
			// range.selectNode(copyField);
			// window.getSelection().addRange(range);
			// document.execCommand('copy');
			// $scope.embedFormCopied = vm.embedFormCopied = true;
		}


		// Kasun_Wijeratne_8_5_2017
		$scope.closeDialog = vm.closeDialog = function () {
			vm.showEmbedMarkup = false;
			$mdDialog.hide();
		}

		$scope.changeDefaultPrice = function (rowname,field,defaultPrice,defaultPriceScheme,change) {
			if(!defaultPrice)
			{
				if(change=="add")
				{
					$scope.content.unitPrice="";
				}
				else if(change=="update")
				{
					vm.editSelectedPlan.unitPrice="";
				}
			}
			$scope.calcUnitPrice(rowname,field,defaultPrice,defaultPriceScheme,change);
		}

		$scope.calcUnitPrice = function (rowname,field,defaultPrice,defaultPriceScheme,change) {
			field=0;
			for (var k = 0; k < rowname.length; k++) {
				var priceSchemeObj=rowname[k];
				if(priceSchemeObj.type=="FIXED" && priceSchemeObj.price!=undefined)
				{
					field=field+priceSchemeObj.price;
				}
				else if(priceSchemeObj.type=="SLAB")
				{
					var smallestTemp=0;
					for (var j = 1; j < priceSchemeObj.scheme.length; j++) {
						var priceSchemeSubObj=priceSchemeObj.scheme[j];
						if(priceSchemeObj.scheme[smallestTemp].unitsFrom>priceSchemeObj.scheme[j].unitsFrom)
						{
							smallestTemp=j;
						}
					}
					if(priceSchemeObj.scheme[smallestTemp].price!=undefined)
					{
						field=field+priceSchemeObj.scheme[smallestTemp].price;
					}
				}
			}
			if(defaultPrice && defaultPriceScheme)
			{
				if(change=="add")
				{
					$scope.content.unitPrice=field;
				}
				else if(change=="update")
				{
					vm.editSelectedPlan.unitPrice=field;
				}
			}
			else if(!defaultPrice)
			{

			}
			else if(!defaultPriceScheme && defaultPrice)
			{
				if(change=="add")
				{
					//$scope.content.unitPrice="";
					$scope.content.default_price=false;
					$scope.features=[];
					$scope.addNewRow($scope.features);
				}
				else if(change=="update")
				{
					//vm.editSelectedPlan.unitPrice="";
					vm.editSelectedPlan.default_price=false;
					vm.editSelectedPlan.priceScheme=[];
					$scope.addNewRow(vm.editSelectedPlan.priceScheme);
				}
			}
			else
			{
				if(change=="add")
				{
					$scope.content.unitPrice="";
				}
				else if(change=="update")
				{
					vm.editSelectedPlan.unitPrice="";
				}
			}
		};

		vm.usingAvalaraTax = false;
		$scope.loadAvalaraTaxes= function () {
			$charge.ccapi().getAvalaraTax().success(function(data) {
				//
				if(data!=undefined && data!=null && data!="") {
					vm.usingAvalaraTax = true;
					$scope.avaTax=data;

				}
				else{
					vm.usingAvalaraTax = false;
				}
			}).error(function(data) {
				//console.log(data);
				vm.usingAvalaraTax = false;
				// $scope.isSpinnerShown=false;
			})
		}
		$scope.loadAvalaraTaxes();

		vm.submitted=false;

		function submitPlan (planForm){

			if(planForm == 'changePlanForm'){
				if (vm.changePlanForm.$valid == true) {
					vm.submitted=true;
					if($scope.content.billingCycleType=="auto")
					{
						$scope.content.billingCycle=-1;
					}

					if(!$scope.content.apply_tax)
					{
						$scope.content.taxID=null;
					}
					//$scope.content.unitPrice=JSON.stringify($scope.content.unitPrice);$scope.features
					$scope.content.rate=$scope.currencyRate;
					$scope.content.currency=$scope.BaseCurrency;

					//for (var i = 0; i < $scope.features.length; i++) {
					//	var priceSchemeObj=$scope.features[i];
					//	if(priceSchemeObj.type == "FIXED")
					//	{
					//		priceSchemeObj.scheme[0].type="FIXED";
					//		priceSchemeObj.scheme[0].unitsFrom=priceSchemeObj.unitsFrom;
					//		priceSchemeObj.scheme[0].unitsTo=priceSchemeObj.unitsTo;
					//		priceSchemeObj.scheme[0].unitUom=priceSchemeObj.unitUom;
					//		priceSchemeObj.scheme[0].price=priceSchemeObj.price;
					//		priceSchemeObj.scheme[0].uom=priceSchemeObj.uom;
					//		priceSchemeObj.scheme[0].autoTermination=priceSchemeObj.autoTermination;
					//		priceSchemeObj.scheme[0].costPerUnitAdd=priceSchemeObj.costPerUnitAdd!=undefined?priceSchemeObj.costPerUnitAdd:"";
					//
					//		for (var k = 1; k < priceSchemeObj.scheme.length; k++) {
					//			priceSchemeObj.scheme.splice(k, 1);
					//		}
					//	}
					//	else if(priceSchemeObj.type == "SLAB")
					//	{
					//		for (var j = 0; j < priceSchemeObj.scheme.length; j++) {
					//			var slabObj=priceSchemeObj.scheme[j];
					//			slabObj.type="SLAB";
					//			slabObj.costPerUnitAdd=slabObj.costPerUnitAdd!=undefined?slabObj.costPerUnitAdd:"";
					//		}
					//	}
					//	else if(priceSchemeObj.type == "optional")
					//	{
					//		priceSchemeObj.scheme[0].type="";
					//		priceSchemeObj.scheme[0].unitsFrom="";
					//		priceSchemeObj.scheme[0].unitsTo="";
					//		priceSchemeObj.scheme[0].unitUom="";
					//		priceSchemeObj.scheme[0].price="";
					//		priceSchemeObj.scheme[0].uom="";
					//		priceSchemeObj.scheme[0].autoTermination="";
					//		priceSchemeObj.scheme[0].costPerUnitAdd="";
					//
					//		for (var k = 1; k < priceSchemeObj.scheme.length; k++) {
					//			priceSchemeObj.scheme.splice(k, 1);
					//		}
					//	}
					//}
					if($scope.content.add_pricingScheme==true)
					{
						//$scope.content.priceScheme=$scope.features;
						$scope.content.priceScheme=[];
						for (var i = 0; i < $scope.priceSchemeFeatureList.length; i++) {
							if($scope.priceSchemeFeatureList[i].isSelected)
							{
								$scope.content.priceScheme.push($scope.priceSchemeFeatureList[i][0].featureCode);
							}
						}
					}
					else
					{
						$scope.content.priceScheme="";
					}

					$scope.content.basePlanCodes=[];
					if($scope.content.type=='Add-on')
					{
						//for (var i = 0; i < $scope.selectedBasePlans.length; i++) {
						//  $scope.content.basePlanCodes.push($scope.selectedBasePlans[i].code);
						//}
						for (var i = 0; i < $scope.basePlanList.length; i++) {
							if($scope.basePlanList[i].isSelected || $scope.content.allBasePlansSelected)
							{
								if($scope.basePlanList[i].billEvery==$scope.content.billEvery)
								{
									$scope.content.basePlanCodes.push($scope.basePlanList[i].code);
								}
							}
						}
					}

					$scope.content.addOnCodes=[];
					if($scope.content.type=='Base-Plan')
					{
						//for (var i = 0; i < $scope.selectedBasePlans.length; i++) {
						//  $scope.content.basePlanCodes.push($scope.selectedBasePlans[i].code);
						//}
						for (var i = 0; i < $scope.addonPlanList.length; i++) {
							if($scope.addonPlanList[i].isSelected || $scope.content.allAddonPlansSelected)
							{
								if($scope.addonPlanList[i].billEvery==$scope.content.billEvery)
								{
									$scope.content.addOnCodes.push($scope.addonPlanList[i].code);
								}
							}
						}
					}

					var planObject = $scope.content;
					//console.log(planObject);
					$charge.plan().createPlan(planObject).success(function(data){
						//console.log(data);
						if(data.response=="succeeded")
						{
							notifications.toast("Successfully Plan Created","success");
							$scope.clearform("");
							vm.submitted=false;

							$scope.infoJson= {};
							$scope.infoJson.message ='Successfully Plan Created';
							$scope.infoJson.app ='plans';
							logHelper.info( $scope.infoJson);

							$scope.editOff = false;
							vm.pageTitle = "Create Plan";

							//$scope.features=[];
							//$scope.addNewRow($scope.features);
							$scope.loadAllPriceSchemeFeatures();

							$scope.selectedBasePlans=[];
							skipBasePlans=0;
							skipAddonPlans=0;
							$scope.loadingBasePlans = true;
							$scope.loadingAddonPlans = true;
							$scope.basePlanList=[];
							$scope.loadAllBasePlans();
							$scope.addonPlanList=[];
							$scope.loadAllAddonPlans();

							skip=0;
							$scope.items = [];
							$scope.loading=true;
							$scope.content = {};
							vm.changePlanForm.$setPristine();
							vm.changePlanForm.$setUntouched();
							// vm.changePlanForm.$setDirty();
							vm.activePlanPaneIndex = 0;
							$scope.more("","");
							//$window.location.href='#/paymentlist';
						}
						else if(data.response=="failed")
						{
							$errorCheck.getClient().LoadErrorList(data.error).onComplete(function(Response)
							{
								var result=Response;
								notifications.toast(result,"error");

								$scope.infoJson= {};
								$scope.infoJson.message =result;
								$scope.infoJson.app ='plans';
								logHelper.error( $scope.infoJson);
								//$scope.errorlist=Response;
								//for(var i=0; i<$scope.errorlist.length; i++)
								//{
								//  var errmsg=$scope.errorlist[i];
								//  if(data.error[errmsg])
								//  {
								//    notifications.toast(data.error[errmsg][0],"error");
								//  }
								//}
							}).onError(function(data)
							{
								//console.log(data);
							});
							//notifications.toast(data.error["STATUS_UNPROCESSABLE_ENTITY"][0],"error");

							//console.log(data);
							vm.submitted=false;
						}

					}).error(function(data){
						//
						if(data==201)
						{
							notifications.toast("Successfully Plan Created","success");
							vm.activePlanPaneIndex = 0;
							$scope.loading=true;
							$scope.more("","");
							$scope.clearform("");
						}
						else if(data.response=="failed")
						{
							//for(var ermsg in data.error)
							//{
							//  notifications.toast(data.error[ermsg][0],"error");
							//}
							$errorCheck.getClient().LoadErrorList(data.error).onComplete(function(Response)
							{
								var result=Response;
								notifications.toast(result,"error");

								$scope.infoJson= {};
								$scope.infoJson.message =result;
								$scope.infoJson.app ='plans';
								logHelper.error( $scope.infoJson);
								//$scope.errorlist=Response;
								//for(var i=0; i<$scope.errorlist.length; i++)
								//{
								//  var errmsg=$scope.errorlist[i];
								//  if(data.error[errmsg])
								//  {
								//    notifications.toast(data.error[errmsg][0],"error");
								//  }
								//}
							}).onError(function(data)
							{
								//console.log(data);
							});
							//notifications.toast(data.error["STATUS_UNPROCESSABLE_ENTITY"][0],"error");
						}
						else
						{
							notifications.toast("Error creating Plan","error");
							//console.log(data);
						}
						vm.submitted=false;
					})
				}else{
					angular.element('#changePlanForm').find('.ng-invalid:visible:first').focus();
				}
				//toggleinnerView('add');
			}
			else if(planForm == 'editPlanForm'){
				if (vm.editPlanForm.$valid == true) {
					vm.submitted=true;
					if(vm.editSelectedPlan.billingCycleType=="auto")
					{
						vm.editSelectedPlan.billingCycle=-1;
					}

					if(!vm.editSelectedPlan.apply_tax)
					{
						vm.editSelectedPlan.taxID=null;
					}
					//$scope.content.unitPrice=JSON.stringify($scope.content.unitPrice);
					//vm.editSelectedPlan.rate=$scope.currencyRate;

					//for (var i = 0; i < vm.editSelectedPlan.priceScheme.length; i++) {
					//	var priceSchemeObj=vm.editSelectedPlan.priceScheme[i];
					//	if(priceSchemeObj.type == "FIXED")
					//	{
					//		priceSchemeObj.scheme[0].type="FIXED";
					//		priceSchemeObj.scheme[0].unitsFrom=priceSchemeObj.unitsFrom;
					//		priceSchemeObj.scheme[0].unitsTo=priceSchemeObj.unitsTo;
					//		priceSchemeObj.scheme[0].unitUom=priceSchemeObj.unitUom;
					//		priceSchemeObj.scheme[0].price=priceSchemeObj.price;
					//		priceSchemeObj.scheme[0].uom=priceSchemeObj.uom;
					//		priceSchemeObj.scheme[0].autoTermination=priceSchemeObj.autoTermination;
					//		priceSchemeObj.scheme[0].costPerUnitAdd=priceSchemeObj.costPerUnitAdd!=undefined?priceSchemeObj.costPerUnitAdd:"";
					//
					//		for (var k = 1; k < priceSchemeObj.scheme.length; k++) {
					//			priceSchemeObj.scheme.splice(k, 1);
					//		}
					//	}
					//	else if(priceSchemeObj.type == "SLAB")
					//	{
					//		for (var j = 0; j < priceSchemeObj.scheme.length; j++) {
					//			var slabObj=priceSchemeObj.scheme[j];
					//			slabObj.type="SLAB";
					//			slabObj.costPerUnitAdd=slabObj.costPerUnitAdd!=undefined?slabObj.costPerUnitAdd:"";
					//		}
					//	}
					//	else if(priceSchemeObj.type == "optional")
					//	{
					//		priceSchemeObj.scheme[0].type="";
					//		priceSchemeObj.scheme[0].unitsFrom="";
					//		priceSchemeObj.scheme[0].unitsTo="";
					//		priceSchemeObj.scheme[0].unitUom="";
					//		priceSchemeObj.scheme[0].price="";
					//		priceSchemeObj.scheme[0].uom="";
					//		priceSchemeObj.scheme[0].autoTermination="";
					//		priceSchemeObj.scheme[0].costPerUnitAdd="";
					//
					//		for (var k = 1; k < priceSchemeObj.scheme.length; k++) {
					//			priceSchemeObj.scheme.splice(k, 1);
					//		}
					//	}
					//}

					if(vm.editSelectedPlan.add_pricingScheme==true)
					{
						//$scope.content.priceScheme=$scope.features;
						vm.editSelectedPlan.priceScheme=[];
						for (var i = 0; i < $scope.priceSchemeFeatureList.length; i++) {
							if($scope.priceSchemeFeatureList[i].isSelected)
							{
								vm.editSelectedPlan.priceScheme.push($scope.priceSchemeFeatureList[i][0].featureCode);
							}
						}
					}
					else
					{
						vm.editSelectedPlan.priceScheme="";
					}
					//$scope.content.priceScheme=$scope.features;

					vm.editSelectedPlan.basePlanCodes=[];
					if(vm.editSelectedPlan.type=='Add-on')
					{
						//for (var i = 0; i < $scope.selectedBasePlans.length; i++) {
						//  vm.editSelectedPlan.basePlanCodes.push($scope.selectedBasePlans[i].code);
						//}
						for (var i = 0; i < $scope.basePlanList.length; i++) {
							if($scope.basePlanList[i].isSelected || vm.editSelectedPlan.allBasePlansSelected)
							{
								if($scope.basePlanList[i].billEvery==vm.editSelectedPlan.billEvery)
								{
									vm.editSelectedPlan.basePlanCodes.push($scope.basePlanList[i].code);
								}
							}
						}
					}

					vm.editSelectedPlan.addOnCodes=[];
					if(vm.editSelectedPlan.type=='Base-Plan')
					{
						//for (var i = 0; i < $scope.selectedBasePlans.length; i++) {
						//  vm.editSelectedPlan.basePlanCodes.push($scope.selectedBasePlans[i].code);
						//}
						for (var i = 0; i < $scope.addonPlanList.length; i++) {
							if($scope.addonPlanList[i].isSelected || vm.editSelectedPlan.allAddonPlansSelected)
							{
								if($scope.addonPlanList[i].billEvery==vm.editSelectedPlan.billEvery)
								{
									vm.editSelectedPlan.addOnCodes.push($scope.addonPlanList[i].code);
								}
							}
						}
					}

					var planObject = vm.editSelectedPlan;
					//console.log(planObject);
					$charge.plan().updatePlan(planObject).success(function(data){
						//console.log(data);
						if(data.response=="succeeded")
						{
							notifications.toast("Successfully Plan Modified","success");
							$scope.tempEditPlan=angular.copy(vm.editSelectedPlan);
							$scope.clearform("");
							vm.submitted=false;

							$scope.infoJson= {};
							$scope.infoJson.message ='Successfully Plan Modified';//JSON.stringify(data);
							$scope.infoJson.app ='plans';
							logHelper.info( $scope.infoJson);

							$scope.selectedBasePlans=[];
							skipBasePlans=0;
							skipAddonPlans=0;
							$scope.loadingBasePlans = true;
							$scope.loadingAddonPlans = true;
							$scope.basePlanList=[];
							$scope.loadAllBasePlans();
							$scope.addonPlanList=[];
							$scope.loadAllAddonPlans();
							$scope.selectedPlanFeaturesList=[];
							for (var i = 0; i < $scope.priceSchemeFeatureList.length; i++) {
								if($scope.priceSchemeFeatureList[i].isSelected)
								{
									$scope.selectedPlanFeaturesList.push($scope.priceSchemeFeatureList[i][0]);
								}
							}
							$scope.loadAllPriceSchemeFeatures();

							skip=0;
							$scope.items = [];
							$scope.loading=true;
							vm.activePlanPaneIndex = 0;
							$scope.more($scope.tempEditPlan,"");
							$scope.cancelEdit();
							//selectPlan(vm.editSelectedPlan);
							//$window.location.href='#/paymentlist';
						}
						else if(data.response=="failed")
						{
							$errorCheck.getClient().LoadErrorList(data.error).onComplete(function(Response)
							{
								var result=Response;
								notifications.toast(result,"error");

								$scope.infoJson= {};
								$scope.infoJson.message =result;
								$scope.infoJson.app ='plans';
								logHelper.error( $scope.infoJson);
							}).onError(function(data)
							{
								//console.log(data);
							});
							//notifications.toast(data.error["STATUS_UNPROCESSABLE_ENTITY"][0],"error");

							//console.log(data);
							vm.submitted=false;
						}

					}).error(function(data){
						//
						//if(data==201)
						//{
						//  notifications.toast("Successfully Plan Modified","success");
						//  $scope.clearform();
						//}
						//else
						//{
						//  notifications.toast(data,"error");
						//  console.log(data);
						//}
						if(data.response=="failed")
						{
							$errorCheck.getClient().LoadErrorList(data.error).onComplete(function(Response)
							{
								var result=Response;
								notifications.toast(result,"error");

								$scope.infoJson= {};
								$scope.infoJson.message =result;
								$scope.infoJson.app ='plans';
								logHelper.error( $scope.infoJson);
							}).onError(function(data)
							{
								//console.log(data);
							});
							//notifications.toast(data.error["STATUS_UNPROCESSABLE_ENTITY"][0],"error");
						}
						else
						{
							notifications.toast(data,"error");
						}
						//console.log(data);
						vm.submitted=false;
					})
				}else{
					angular.element('#editPlanForm').find('.ng-invalid:visible:first').focus();
				}
			}

		}

		$scope.searchKeyPress = function (event,keyword,length){
			if(event.keyCode === 13)
			{
				//console.log("Function Reached!");
				$scope.loadByKeywordPlan(keyword,length);
			}
		}

		var skipPlanSearch, takePlanSearch;
		var tempList;
		$scope.loadByKeywordPlan= function (keyword,length) {
			if($scope.items.length>=100) {
				//
				if(length==undefined)
				{
					keyword="undefined";
					length=0;
				}
				var searchLength=length;
				//if(keyword.toLowerCase().startsWith($scope.expensePrefix.toLowerCase()))
				//{
				//  keyword=keyword.substr($scope.expensePrefix.length);
				//  console.log(keyword);
				//  searchLength=1;
				//}hirtocer@deyom.com

				if (keyword.length == searchLength) {
					//console.log(keyword);
					//
					skipPlanSearch = 0;
					takePlanSearch = 100;
					tempList = [];

					var dbName="";
					dbName=getDomainName().split('.')[0]+"_"+getDomainExtension();
					//filter="api-version=2016-09-01&?search=*&$orderby=createdDate desc&$skip="+skip+"&$top="+take+"&$filter=(domain eq '"+dbName+"')";
					var data={
						"search": keyword+"*",
						"searchFields": "code,name",
						"filter": "(domain eq '"+dbName+"')",
						"orderby" : "createdDate desc",
						"top":takePlanSearch,
						"skip":skipPlanSearch
					}


					$charge.azuresearch().getAllPlansPost(data).success(function (data) {
						for (var i = 0; i < data.value.length; i++) {
							tempList.push(data.value[i]);
						}
						vm.plans = tempList;
						//skipProfileSearch += takeProfileSearch;
						//$scope.loadPaging(keyword, skipProfileSearch, takeProfileSearch);
					}).error(function (data) {
						vm.plans = [];
					});
				}
				else if (keyword.length == 0 || keyword == null) {
					vm.plans = $scope.items;
				}

				if(searchLength==0||searchLength==undefined)
				{
					$scope.loading=true;
					$scope.more("","");
				}
			}
		}

		//function gst(name) {
		//	var nameEQ = name + "=";
		//	var ca = document.cookie.split(';');
		//	for (var i = 0; i < ca.length; i++) {
		//		var c = ca[i];
		//		while (c.charAt(0) == ' ') c = c.substring(1, c.length);
		//		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
		//	}
		//	//debugger;
		//	return null;
		//}
		$scope.subscriptionKey="";
		$charge.tenantEngine().getSubscriptionIdByTenantName(getDomainName()).success(function (response) {

			if(response.status) {
				var subscriptionID = response.data["0"].subscriptionID;

				if (subscriptionID) {

					$charge.myAccountEngine().getSubscriptionInfoByID(subscriptionID).success(function (data) {
						if(data.Result)
						{
							$scope.subscriptionKey = data.Result.primaryKey;
						}
					}).error(function (data) {

					});
				}
			}
		}).error(function (data) {
		});

		$scope.selectMultiplePlansForEmbedForm = false;
		$scope.getMultipleEmbedPlans= function (option) {
			$scope.showInpageReadpane = false;
			vm.activePlanPaneIndex = 0;
			if(option=='true')
			{
				for(var i=0; i<vm.plans.length; i++){
					vm.plans[i].selectForEmbed = false;
				}
				$scope.selectMultiplePlansForEmbedForm = true;
			}
			else
			{
				vm.clearSelectedEmbed();
				$scope.selectMultiplePlansForEmbedForm = false;
			}
		}

		$scope.baseUrl="";
		$http.get('app/core/cloudcharge/js/config.json').then(function(data){

			//console.log(data);
			$scope.baseUrl=data.data["plan"]["domain"];
			//$scope.loadFilterCategories('dashBoardReport.mrt');
			$scope.baseUrl=$scope.baseUrl.split('/')[2];
		}, function(errorResponse){
			//console.log(errorResponse);
			$scope.baseUrl="";
		});

		function getSecurityToken() {
			var _st = gst("SubscriptionKey");
			return (_st != null) ? _st : ""; //"248570d655d8419b91f6c3e0da331707 51de1ea9effedd696741d5911f77a64f";
		}

		$scope.selectedPlansForEmbed=[];
		$scope.embedPreview = false;
		$scope.getPlansForEmbed= function (plans, ev) {
			$scope.embedPreview = true;
			var tempSelectedPlans=[];
			$scope.selectedPlansForEmbed=[];

			for(var i=0; i<plans.length; i++){
				if(plans[i].selectForEmbed)
				{
					tempSelectedPlans.push(plans[i]);
				}
				else
				{
					if(plans[i]==plans[plans.length-1])
					{
						if(tempSelectedPlans.length==0)
						{
							$scope.embedPreview = false;
							notifications.toast("Select Plan(s) for Generate Embed Form","error");
						}
					}
				}
			}

			for(var j=0; j<tempSelectedPlans.length; j++){
				$charge.plan().getPlanByCode(tempSelectedPlans[j].code).success(function(data){
					//console.log(data);
					$scope.selectedPlansForEmbed.push(data);
					if(tempSelectedPlans.length==$scope.selectedPlansForEmbed.length)
					{
						$scope.embedPreview = false;
						$scope.getEmbededPlanForm($scope.selectedPlansForEmbed, ev, false);
					}
				}).error(function(data){
					//basePlanCodes
					//console.log(data);
				})
			}

		}

		vm.clearSelectedEmbed = function (leave) {
			$mdDialog.hide();
			vm.showEmbedMarkup = false;
			for(var i=0; i<vm.plans.length; i++){
				vm.plans[i].selectForEmbed = false;
			}
			if(leave){
				$scope.selectMultiplePlansForEmbedForm=false;
			}
		};

		$scope.fullEmbededPlanForm="";
		$scope.embededFormEnabled=false;
		vm.embedPlanAccent = '#039be5';
		vm.embedPlanWidth = 33.3;

		// DEPRICATED - This method has been depricated since multiple Templates have been introduced for the user to select

		// $scope.getEmbededPlanForm= function (plans, ev, innerCall) {
		// 	// $scope.selectMultiplePlansForEmbedForm = false;
		// 	$scope.embededFormEnabled=true;
		//
		// 	// Kasun_Wijeratne_8_5_2017
		// 	$scope.showEmbedForm = true;
		// 	// Kasun_Wijeratne_8_5_2017
		//
		// 	//var planDetailView = document.getElementById("plan-detail-view").innerHTML;
		// 	var planDetailSelectView="";
		// 	//var planDetailView = "<div style='border: solid 1px #addcf3;border-radius: 5px'> <div style='padding: 20px;text-align: center;font-size: 25px;background: #039be5;color: #fff;border-top-left-radius: 5px;border-top-right-radius: 5px' class='ng-binding'>planfeature001</div> <div style='overflow: hidden;text-align: center;background: #fafafa;border-bottom: solid 1px #eee;padding: 36px 0;'> <div style='display: inline-block;font-size: 40px;font-weight: bold;color: #039be5;' class='ng-binding'>$10</div> <div style='display: inline-block;font-size: 22px;font-weight: 400;color: #AAA;' class='ng-binding'>/ 1 Months</div> </div> <div style='overflow: hidden;padding: 10px 0'> <div style='text-align: center;margin-bottom: 5px;'> <span style='margin-right: 10px;color: #a5d4ea;' class='feature-row'>✔</span><span style='color: rgba(0, 0, 0, 0.5);text-align: left' class='ng-binding'> /Unit</span> </div> <div style='text-align: center;margin-bottom: 5px;'> <span style='margin-right: 10px;color: #a5d4ea;' class='feature-row'>✔</span><span style='color: rgba(0, 0, 0, 0.5);text-align: left' class='ng-binding'>Rate 1</span> </div> <div style='text-align: center;margin-bottom: 5px;'> <span style='margin-right: 10px;color: #a5d4ea;' class='feature-row'>✔</span><span style='color: rgba(0, 0, 0, 0.5);text-align: left' class='ng-binding'>0 trail day<!-- ngIf: vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0 --><span ng-if='vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0' class='ng-scope' style=''>s</span><!-- end ngIf: vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0 --> </span> </div> </div> </div>";
		// 	//angular.forEach([1,1,1], function () {
		// 	//	planDetailView = planDetailView.toString().replace("✔", "&#10004");
		// 	//	planDetailView = planDetailView.replace("<!-- ngIf: vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0 -->", "");
		// 	//	planDetailView = planDetailView.replace("<!-- end ngIf: vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0 -->", "");
		// 	//	planDetailView = planDetailView.replace('ng-if="vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0" class="ng-scope"', "");
		// 	//});
		// 	$scope.planBodyHeight = 0;
		// 	for(var i=0;i<plans.length;i++) {
		// 		// var tempHeight = 60 + (25*plans[i].priceScheme.length);
		// 		// if($scope.planBodyHeight == 0 && plans[i].priceScheme.length == 0){
		// 		// 	$scope.planBodyHeight = 60;
		// 		// }else if(tempHeight > $scope.planBodyHeight){
		// 		// 	$timeout(function(){
		// 		// 		$scope.planBodyHeight = tempHeight;
		// 		// 	},0);
		// 		// }
		// 		var planIndiViewStart = "<div style='border: solid 1px #ccc;border-radius: 5px;margin: 0 auto;'> <div class='ab' style='padding: 15px;text-align: center;font-size: 25px;background: "+vm.embedPlanAccent+";color: #fff;border-top-left-radius: 5px;border-top-right-radius: 5px' class='ng-binding'>"+plans[i].name+"</div> <div style='overflow: hidden;text-align: center;background: #fafafa;border-bottom: solid 1px #eee;padding: 25px 0;'> <div class='af' style='display: inline-block;font-size: 25px;font-weight: bold;color: "+vm.embedPlanAccent+"' class='ng-binding'>"+plans[i].unitPrice+" "+plans[i].currency+"</div> <div style='display: inline-block;font-size: 14px;font-weight: 400;color: #AAA;' class='ng-binding'>/ "+plans[i].billingInterval+" "+plans[i].billEvery+"</div> </div> <div class='package-body' style='overflow: hidden;padding: 10px 0'> <div style='text-align: center;margin-bottom: 20px;'><span style='font-size: 14px;color: #000;text-align: left' class='ng-binding'>"+plans[i].trailDays+" trail day<span ng-if='vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0' class='ng-scope' style=''>s</span><!-- end ngIf: vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0 --> </span> </div>";
		// 		var featurecode = "";
		// 		for(var j=0;j<plans[i].priceScheme.length;j++){
		// 			var featurecodeObj = "<div style='text-align: center;margin-bottom: 5px;'> <span style='margin-right: 10px;color: #a5d4ea;' class='feature-row'>✔</span><span style='color: rgba(0, 0, 0, 0.5);text-align: left' class='ng-binding'>"+plans[i].priceScheme[j].featureCode +"</span> </div>";
		// 			featurecode = featurecode + featurecodeObj;
		// 		}
		// 		var IndiViewEnd = "</div> </div>";
		// 		var planIndiView = planIndiViewStart+featurecode+IndiViewEnd;
		// 		angular.forEach([1,1,1], function () {
		// 			planIndiView = planIndiView.toString().replace("✔", "&#10004");
		// 			planIndiView = planIndiView.replace("<!-- ngIf: vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0 -->", "");
		// 			planIndiView = planIndiView.replace("<!-- end ngIf: vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0 -->", "");
		// 			planIndiView = planIndiView.replace('ng-if="vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0" class="ng-scope"', "");
		// 		});
		//
		// 		var startForm = "<form name='planEmbededSubscriptionForm"+i+"' action='https://"+$scope.baseUrl+"/planEmbededForm/planSubscriptionScript.php/?method=subscriptionPlan' method='post' id='form"+i+"' style='display: inline-block;width:"+vm.embedPlanWidth+"%;padding: 10px;float: left'>";
		// 		var endForm = "<div style='text-align: center'><input type='hidden' name='emailAddress' placeholder='Email' style='width: 90%;height: 25px;padding: 5px;border-radius:5px;border: solid 1px #bbb;' /><br>" +
		// 			"<input type='hidden' name='planCode' id='planCode"+i+"' value='"+plans[i].code+"'>" +
		// 			"<input type='hidden' name='paymentOption' id='paymentOption"+i+"' value='"+plans[i].paymentOption+"'>" +
		// 			"<input type='hidden' name='subscriptionKey' id='subscriptionKey"+i+"' value='"+$scope.subscriptionKey+"'>" +
		// 			"<input type='hidden' name='mode' id='mode"+i+"' value='"+getDomainExtension()+"'>" +
		// 			"<input type='hidden' name='theme' id='theme"+i+"' value='"+vm.embedPlanAccent.split('#')[1]+"'>" +
		// 			"<button name='subscriptionButton' type='submit' value='submit' class='ab' style='width: 95%;height: 37px;font-size: 17px;padding: 8px 20px;color: #fff;background-color: "+vm.embedPlanAccent+";box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);border: none;border-radius: 5px;'>Subscribe</button></div></body></form>";
		//
		// 		planDetailSelectView=planDetailSelectView+startForm+planIndiView+endForm;
		// 	}
		//
		// 	var scriptSubmit= "<script type='text/javascript'>" +
		// 		"submitFormData = function(){" +
		// 		//"var planCode=$post->planCode;" +
		// 		//"var emailAdress=$post->emailAddress;" +
		// 		//"var subscriptionKey=$post->subscriptionKey;" +
		// 		"var planCode=document.getElementById('planCode').value;" +
		// 		"var emailAdress=document.getElementById('emailAddress').value;" +
		// 		"var paymentOption=document.getElementById('paymentOption').value;" +
		// 		"var subscriptionKey=document.getElementById('subscriptionKey').value;" +
		// 		"var mode=document.getElementById('mode').value;" +
		// 		"var theme=document.getElementById('theme').value;" +
		// 		//"window.alert(planCode+' '+subscriptionKey);" +
		// 		"}" +
		// 		"</script>";
		// 	//'models/portalservice.php/?method=payment&&data='+data+'&&meta='+queryString[1]
		//
		// 	var fullEmbededForm = planDetailSelectView + scriptSubmit;
		//
		// 	vm.fullEmbedMarkup = fullEmbededForm;
		// 	$scope.fullEmbededPlanForm=fullEmbededForm;
		//
		// 	if(!innerCall){
		// 		$scope.injectMarkup();
		// 		$mdDialog.show({
		// 			controller: function () {
		// 				return vm;
		// 			},
		// 			controllerAs: 'ctrl',
		// 			templateUrl: 'app/main/plans/dialogs/embed/embed-preview.html',
		// 			parent: angular.element(document.body),
		// 			targetEvent: ev,
		// 			clickOutsideToClose:false // Only for -xs, -sm breakpoints.
		// 		}).then(function(confirmation) {
		// 		}, function() {
		// 			$mdDialog.hide();
		// 		});
		//
		// 	}else{
		// 		vm.planInjected = true;
		// 		vm.showEmbedMarkup = true;
		// 		var codee = document.getElementById('embededCode');
		// 		hljs.highlightBlock(codee);
		// 	}
		//
		// }

		// DEPRICATED

		$scope.getEmbededPlanForm= function (plans, ev, innerCall) {
			var isOpen = $mdDialog.show({
				controller: function () {
					return vm;
				},
				controllerAs: 'ctrl',
				templateUrl: 'app/main/plans/dialogs/embed/embed-templates-preview.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose:false // Only for -xs, -sm breakpoints.
			}).then(function(confirmation) {
			}, function() {
				$mdDialog.hide();
			});

			var counter = 0;
			var initialTemplateWatcher = $interval(function () {
				if(isOpen){
					vm.updateTemplate(1);
					vm.planInjected = true;
					if(counter==2)$interval.cancel(initialTemplateWatcher);
				}
				counter++;
			}, 100);

		}

		vm.planEmbedName = null;
		var isolateindex = 0;
		vm.updateTemplate = function (temp) {
			$('#embedPreview').empty();
			vm.currentTemplate = temp;
			vm.templatesubval = null;
			vm.planEmbedName = "";

			$.get( "app/main/plans/views/templates/Embeddable Plans templates/subscriptions_template_"+temp+".html", function( template ) {

				isolateindex = 0;
				var selectedTemplate = $(template),
					planUIString = "",
					planindex = 0;

				angular.forEach($scope.selectedPlansForEmbed, function (plan) {
					var planUI = $(template).find('.plans').find('.row-block');

					planUI.find('.p-name').html(plan.name);
					planUI.find('.p-price').html('$'+plan.unitPrice);
					planUI.find('.p-billfrq').html(' / '+plan.billEvery);
					if(temp == 1 || temp == 2){
						planUI.find('.p-check').attr('id', 'plan'+planindex);
						planUI.find('.p-name').attr('for', 'plan'+planindex);
						planUI.find('.p-name').attr('data-id', 'plan'+planindex);
						planUI.find('.p-name').attr('data-code', 'plan'+planindex);
					}

					if(plan.priceScheme.length != 0){
						var tempFeat = "";
						angular.forEach(plan.priceScheme, function (feat) {
							tempFeat = tempFeat + '<li><span class="list-icon af">✓</span>'+feat.featureCode+'</li>';
						});
						if(temp == 1 || temp == 2){
							selectedTemplate.find('.p-features-body').append('<ul class="p-features" data-id="plan'+planindex+'">'+tempFeat+'</ul>');
						}else{
							planUI.find('.p-features').empty();
							planUI.find('.p-features').append(tempFeat);
						}
					}

					if(plan.type == 'Base-Plan'){
						if(plan.addOnCodes.length != 0){
							var tempAddon = "";
							angular.forEach(plan.addOnCodes, function (addon) {
								tempAddon = tempAddon + '<li><span class="list-icon af">✪</span>'+addon+'</li>';
							});
							if(temp == 1 || temp == 2){
								selectedTemplate.find('.p-addons-body').append('<ul class="p-addons" data-id="plan'+planindex+'">'+tempAddon+'</ul>');
							}else{
								planUI.find('.p-addons').append(tempAddon);
							}
						}else{
							planUI.find('.addons-block .p-details-heading').empty();
						}
					}

					if(plan.taxID != ""){
						$charge.tax().getTaxGrpByIDs(plan.taxID).success(function(data) {
							var taxid=data.groupDetail[0].taxid;
							$charge.tax().getTaxByIDs(taxid).success(function(data) {
								planUI.find('.p-tax').html(data[0].amount + data[0].amounttype);

								var stringifiedDom = $scope.stringigyDOM(planUI);
								planUIString = planUIString + stringifiedDom;
							}).error(function(data) {
							})
						}).error(function(data) {
						});
					}
					else{
						var stringifiedDom = $scope.stringigyDOM(planUI);
						planUIString = planUIString + stringifiedDom;
					}

					if(planindex != $scope.selectedPlansForEmbed.length-1){
						vm.planEmbedName = vm.planEmbedName+plan.code+"_";
					}
					else{
						vm.planEmbedName = vm.planEmbedName+plan.code;
					}

					planindex ++;

				});

				selectedTemplate.find('.plans').html(planUIString);
				$('#embedPreview').append(selectedTemplate);

				vm.updateMainAccentInEmbed(vm.embedPlanAccent);
				if(temp == 1 || temp == 2){
					var initplans = $('.p-name');
					$(initplans[0]).trigger("click");
				}

			});
		}

		vm.templatesubval = null;
		vm.updateIsolatedPlan = function(state){
			$('.embed-temp-preview').find('.row-block').removeClass('isolated');
			var plans = document.getElementsByClassName('row-block');

			if(isolateindex < plans.length-1){
				isolateindex++;
			}else{
				isolateindex = 0;
			}
			for(var i=0;i<plans.length;i++){
				if(i == isolateindex){
					plans[isolateindex].classList.add('isolated');
					vm.templatesubval = isolateindex;
				}
			}
		}

		$scope.stringigyDOM = function (domtostring) {
			var tempNode = document.createElement('div');
			$(tempNode).append(domtostring);
			return $(tempNode).html();
		}

		vm.planInjected = false;
		$scope.injectMarkup = function () {
			$timeout(function(){
				var embedPreCnt = angular.element('#embedPreview');
				embedPreCnt.append(vm.fullEmbedMarkup);
				vm.planInjected = true;
			}, 500);

			$timeout(function(){
				var packs = document.getElementsByClassName('package-body');
				var tempHeight = 0;
				angular.forEach(packs, function (pack) {
					if(pack.clientHeight>tempHeight ){
						tempHeight = pack.clientHeight;
					};
				});
				$('.package-body').css('height',tempHeight);
			}, 510);
		}

		$scope.nothingSelected = true;
		$scope.isNothingSelected = [];
		$scope.$watch(function () {
			$scope.isNothingSelected = [];
			angular.forEach($scope.priceSchemeFeatureList, function (feature) {
				if(feature.isSelected){
					$scope.isNothingSelected.push('ok');
				}
			});
			$scope.isNothingSelected.length == 0 ? $scope.nothingSelected = true : $scope.nothingSelected = false;

		});

		vm.updateMainAccentInEmbed = function (color) {
			vm.embedPlanAccent = color;
			$('.af').css('color',vm.embedPlanAccent);
			$('.ab').css('background',vm.embedPlanAccent);
		}

		vm.updateLayout = function (count) {
			vm.embedPlanWidth = 100/count;
			$('#embedPreview form').css('width',vm.embedPlanWidth+'%');
		}

		vm.showEmbedMarkup = false;
		vm.embedablePlansURL = false;
		vm.continueToEmbedMarkup = function () {
			vm.loadingEmbedMarkup = true;
			// $scope.getEmbededPlanForm($scope.selectedPlansForEmbed, null, true);
			var encryptedData = null;
			var embedData = {
				"planCode":vm.planEmbedName,
				"subscriptionKey":$scope.subscriptionKey,
				"mode":getDomainExtension(),
				"theme":vm.embedPlanAccent.split('#')[1],
				"template":vm.currentTemplate,
				"templatesubval":vm.templatesubval
			};

			var encryptObj = {
				"value" : JSON.stringify(embedData)
			}

			// var encryptObj = {
			// 	"value" : '{"planCode":'+JSON.stringify(vm.planEmbedName)+',"subscriptionKey":'+JSON.stringify($scope.subscriptionKey)+',"mode":'+JSON.stringify(getDomainExtension())+',"theme":'+JSON.stringify(vm.embedPlanAccent.split("#")[1])+',"template":'+vm.currentTemplate+',"templatesubval":'+vm.templatesubval+'}'
			// };

			$charge.storage().encryptString(encryptObj).success(function (data) {
				if(data.status)
				{
					encryptedData = encodeURIComponent(data.encrypted);
					vm.embedablePlansIframe =
						"<iframe src='https://"
						+ $scope.baseUrl
						+ "/planEmbededForm/planSubscriptionScript.php/?method=generateEmbedForm&&embedData="
						+ encryptedData
						+"'></iframe>";
					vm.embedablePlansURL = "https://"+ $scope.baseUrl+ "/planEmbededForm/planSubscriptionScript.php/?method=generateEmbedForm&&embedData="+ encryptedData;

					vm.showEmbedMarkup = true;
					vm.loadingEmbedMarkup = false;
					//var decryptObj = {
					//  "value" : $scope.subscriptionKeyEncrypt
					//}
					//$charge.storage().decryptString(decryptObj).success(function (data) {
					//  if(data.status)
					//  {
					//    $scope.subscriptionKeyDecrypt = data.decrypted;
					//  }
					//
					//}).error(function (data) {
					//
					//});
				}

			}).error(function (data) {
				// $scope.subscriptionKeyEncrypt = $scope.subscriptionKey;
				vm.loadingEmbedMarkup = false;
			});

		}

		vm.goBackToPreview = function () {
			vm.planInjected = false;
			// vm.coppiedTimeout = false;
			// vm.copyStarted = false;
			$scope.injectMarkup();
			vm.showEmbedMarkup = false;
			vm.updateTemplate(1);
		}
	}
})();
