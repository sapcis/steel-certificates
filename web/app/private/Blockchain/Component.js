sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	'sap/ui/model/odata/v2/ODataModel',
	'sap/ui/model/json/JSONModel'
], function (UIComponent, Device, ODataModel,JSONModel){
	"use strict";

	return UIComponent.extend("sap.suite.ui.commons.sample.Blockchain.Component", {

		metadata: {
			rootView: "sap.suite.ui.commons.sample.Blockchain.Main",
			dependencies: {
				libs: [
					"sap.m",
					"sap.ui.layout",
					"sap.ui.core",
					"sap.suite.ui.commons"
				]
			},
			config: {
				sample: {
					files: [
						"Main.view.xml",
						"Main.controller.js",
					]
				}
			}
		},
		init:function(){
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			//this.getRouter().initialize();

			// set the device model
			//this.setModel(models.createDeviceModel(), "device");
			// set table model
			var oTable = new JSONModel();
			oTable.setSizeLimit(1000);
			this.setModel(oTable, "main");
		}
	});
});
