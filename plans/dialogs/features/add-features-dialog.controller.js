/**
 * Created by Suvethan on 11/15/2016.
 */

(function ()
{
  'use strict';
  angular
    .module('app.plans')
    .controller('AddFeaturesController', AddFeaturesController);

  /** @ngInject */
  function AddFeaturesController($mdDialog, $scope,$charge, notifications, features, uoms, mode, $timeout)
  {
    var vm=this;
    var self = vm;

    vm.features=features;
    vm.uoms=uoms;
    vm.mode=mode;

    if(vm.mode == 'Update'){
    	$timeout(function () {
			vm.advancedFeaturesConfirmed = true;
			vm.loaded = true;
		});
	};

    vm.featureType='';
    $scope.setFeature = function (row, type) {
      // row.advancedFeaturesConfirmed = true;
		vm.featuresInit = false;
		vm.showAdvanceFeatures=true;
      type == 'FIXED' ? row.type = 'FIXED' : row.type='SLAB';
      type == 'FIXED' ? vm.featureType = 'FIXED' : vm.featureType='SLAB';
      var elem = document.getElementsByClassName('content-wrapper')[0];
      elem.scrollTop = elem.scrollHeight - elem.clientHeight;
    }

    vm.setAdvanceFeatures=function(row) {
      // row.showAdvanceFeatures=true;
		vm.featuresInit = true;
		// angular.element('#createFeatureType').triggerHandler('click');
    }
    vm.closeAdvanceFeatures=function(row) {
      // row.showAdvanceFeatures=false;
      // row.advancedFeaturesConfirmed = false;
      row.type = "optional";

      vm.showAdvanceFeatures=false;
		vm.featuresInit = false;
      vm.featureType = "optional";

      vm.addNewUOM=false;
      vm.newUOM = "";

    }

    if(vm.mode=='Update')
    {
      vm.featureType=vm.features.type;
      if(vm.featureType!='optional')
      {
        vm.advancedFeaturesConfirmed = true;
        vm.showAdvanceFeatures = true;
        //vm.setAdvanceFeatures(vm.features);
        //vm.closeAdvanceFeatures(vm.features);
        $scope.setFeature(vm.features, vm.featureType);
      }
    }

    $scope.addNewSlab=function(slab) {

      var slabObj = {};
      //featureObj.productlst = angular.copy($scope.productlist);
      slabObj.type = "SLAB";
      slabObj.autoTermination = true;
      slab.scheme.push(slabObj);
    }

    $scope.removerow = function (index,rowname) {

      if(rowname.length!=1)
      {
        rowname.splice(index, 1);
      }
      //rowname.splice(index, 1);
      //self1.searchText.splice(index,1);

    }

    $scope.addUOM = function () {
      var uom=vm.newUOM;
      if (uom != null && uom != "") {
        var isDuplicate = false;
        if (vm.uoms.length != 0) {
          for (var i = 0; i < vm.uoms.length; i++) {
            if (vm.uoms[i].UOMCode == uom) {
              notifications.toast("UOM Code is already exist.", "error");
              vm.newUOM = "";
              isDuplicate = true;
              break;
            }
          }
        }
        if (!isDuplicate) {
          var req = {
            "GUUOMID": "123",
            "GUUOMTypeID": "supplier1",
            "GUTranID": "12345",
            "CommitStatus": "Active",
            "UOMCode": uom,
            "uomApplicationMapperDetail": [{
              "GUApplicationID": "Plan_123"
            }],
            "uomConversionDetails": [{
              "FromUOMCode": uom,
              "Qty": "10",
              "ToUOMCode": uom
            }]

          }
          $charge.uom().store(req).success(function (data) {
            notifications.toast("UOM has been added.", "success");
            vm.uoms.push(req);
            vm.addNewUOM=false;
            vm.newUOM = "";
            //if(data.IsSuccess) {
            //  console.log(data);
            //}
          }).error(function (data) {
            //console.log(data);
            notifications.toast("UOM adding failed", "error");
            vm.addNewUOM=false;
            vm.newUOM = "";
          })
        }
      }
      else{
        notifications.toast("UOM cannot be empty", "error");
      }

    }

    vm.addNewUOM=false;
    $scope.showAddUOMPrompt = function(ev) {
      // Appending dialog to document.body to cover sidenav in docs app
      vm.addNewUOM=true;
      //var confirm = $mdDialog.prompt()
      //  .title('Add new UOM')
      //  .textContent('Enter UOM below')
      //  .placeholder('UOM')
      //  .ariaLabel('UOM')
      //  .initialValue('')
      //  .targetEvent(ev)
      //  .ok('ADD')
      //  .cancel('Cancel');
      //
      //$mdDialog.show(confirm).then(function(result) {
      //  //$scope.status = 'You decided to name your dog ' + result + '.';
      //  $scope.addUOM(result);
      //}, function() {
      //  //$scope.status = 'You didn\'t name your dog.';
      //});
    };

    $scope.closeAddUOM = function() {
      // Appending dialog to document.body to cover sidenav in docs app
      vm.addNewUOM=false;
      vm.newUOM = "";
    };

    $scope.submitAddFeature=function() {

      vm.addFeatureSubmitted=true;

      var priceSchemeObj=vm.features;
      if(priceSchemeObj.type == "FIXED")
      {
        priceSchemeObj.scheme[0].type="FIXED";
        priceSchemeObj.scheme[0].unitsFrom=priceSchemeObj.unitsFrom;
        priceSchemeObj.scheme[0].unitsTo=priceSchemeObj.unitsTo;
        priceSchemeObj.scheme[0].unitUom=priceSchemeObj.unitUom;
        priceSchemeObj.scheme[0].price=priceSchemeObj.price;
        priceSchemeObj.scheme[0].uom=priceSchemeObj.uom;
        priceSchemeObj.scheme[0].autoTermination=priceSchemeObj.autoTermination;
        priceSchemeObj.scheme[0].costPerUnitAdd=priceSchemeObj.costPerUnitAdd!=undefined?priceSchemeObj.costPerUnitAdd:"";

        for (var k = 1; k < priceSchemeObj.scheme.length; k++) {
          priceSchemeObj.scheme.splice(k, 1);
        }
      }
      else if(priceSchemeObj.type == "SLAB")
      {
        for (var j = 0; j < priceSchemeObj.scheme.length; j++) {
          var slabObj=priceSchemeObj.scheme[j];
          slabObj.type="SLAB";
          slabObj.costPerUnitAdd=slabObj.costPerUnitAdd!=undefined?slabObj.costPerUnitAdd:"";
        }
      }
      else if(priceSchemeObj.type == "optional")
      {
        priceSchemeObj.scheme[0].type="";
        priceSchemeObj.scheme[0].unitsFrom="";
        priceSchemeObj.scheme[0].unitsTo="";
        priceSchemeObj.scheme[0].unitUom="";
        priceSchemeObj.scheme[0].price="";
        priceSchemeObj.scheme[0].uom="";
        priceSchemeObj.scheme[0].autoTermination="";
        priceSchemeObj.scheme[0].costPerUnitAdd="";

        for (var k = 1; k < priceSchemeObj.scheme.length; k++) {
          priceSchemeObj.scheme.splice(k, 1);
        }
      }

      if(vm.mode=='Add')
      {
        $charge.plan().addNewFeature(priceSchemeObj).success(function(data){
          //console.log(data);
          if(data.response=="succeeded")
          {
            notifications.toast("Successfully Feature added","success");
            $scope.closeDialog();
          }
          else
          {
            notifications.toast("Feature adding Failed","error");
          }
          vm.addFeatureSubmitted=false;
        }).error(function(data) {
          //console.log(data);
          notifications.toast("Feature adding Failed","error");
          vm.addFeatureSubmitted=false;
        });
      }
      else
      {
        $charge.plan().updateFeature(priceSchemeObj).success(function(data){
          //console.log(data);
          if(data.response=="succeeded")
          {
            notifications.toast("Successfully Feature updated","success");
            $scope.closeDialog();
          }
          else
          {
            notifications.toast("Feature updating Failed","error");
          }
          vm.addFeatureSubmitted=false;
        }).error(function(data) {
          //console.log(data);
          notifications.toast("Feature updating Failed","error");
          vm.addFeatureSubmitted=false;
        });
      }
    }

    $scope.closeDialog = function () {
      $mdDialog.hide();
    }

    //Image Uploader===================================

    //$scope.cropper = cropper;
    //$scope.cropper.sourceImage = null;
    //$scope.cropper.croppedImage = null;
    $scope.bounds = {};
    $scope.bounds.left = 0;
    $scope.bounds.right = 0;
    $scope.bounds.top = 0;
    $scope.bounds.bottom = 0;
    //$scope.productImgFileName = productImgFileName;
   // $scope.productImgSrc = productImgSrc;
    var files = [];

    $scope.triggerImgInput = function () {
      angular.element(document.querySelector('#productImageInput')).trigger('click');
      angular.element(document.querySelector('#productImageInput')).on('change', function () {
        files = this.files;

        if(files.length > 0) {
          $scope.productImgFileName = files[0].name;
        }
      });
    }

    //Image Uploader===================================

  }
})();
