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
			
			var oStatus = new JSONModel([
				{code:'000',name:'Действует'},
				{code:'001',name:'Отменен'},
				{code:'002',name:'Выдан взамен'}
			]);
			oStatus.setSizeLimit(1000);
			this.setModel(oStatus, "status");
			var oCompany = new JSONModel([{
				key:'Severstal',
				text:'Северсталь',
				items:[
					{
						key:"0001",
						text:"Череповецкий металлургический комбинат"
					},{
						key:"0002",
						text:"Ижорский трубный завод"
					},{
						key:"0003",
						text:"Северсталь-Метиз"
					},{
						key:"0004",
						text:"Северсталь СМЦ-Колпино"
					},{
						key:"0005",
						text:"Северсталь-Гонварри-Калуга"
					},{
						key:"0006",
						text:"Северсталь СМЦ-Всеволожск"
					},{
						key:"0007",
						text:"Северсталь ТПЗ-Шексна"
					}
				]
			},{
				key:'OMK',
				text:'Объединенная металлургическая компания',
				items:[
					{
						key:"0001",
						text:"Выксунский Металлургический Завод"
					}
				]
			},{
				key:'TMK',
				text:'Трубная металлургическая компания',
				items:[
					{
						key:"0001",
						text:"Синарский трубный завод"
					},{
						key:"0002",
						text:"Северский трубный завод"
					},{
						key:"0003",
						text:"Волжский трубный завод"
					},{
						key:"0004",
						text:"Таганрогский металлургический завод"
					},{
						key:"0005",
						text:"ТМК-ИНОКС"
					},{
						key:"0006",
						text:"Орский машиностроительный завод"
					},{
						key:"0007",
						text:"Трубопласт"
					},{
						key:"0008",
						text:"ТМК-КПВ"
					},{
						key:"0009",
						text:"ТМК Нефтегазсервис – Бузулук"
					},{
						key:"0010",
						text:"ТМК Нефтегазсервис-Нижневартовск"
					},{
						key:"0011",
						text:"ТМК-Казтрубпром"
					}
				]
			}]);
			this.setModel(oCompany, "company");
		}
	});
});
