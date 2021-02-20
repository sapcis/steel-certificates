sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox"
], function (Controller,JSONModel,MessageBox) {
	"use strict";

	return Controller.extend("sap.suite.ui.commons.sample.Blockchain.Main", {
		onInit:function(){
			window.that = this;
	    	window.that.getView().byId("saveToBlockchain").setEnabled(false);
		},
		onFileUploaderChange:function(oEvent){
			console.log(oEvent);
			var reader = new FileReader();
			var oModel = this.getView().getModel('main');
			reader.onload = function(event) {
			    var text = event.target.result;
			    var json = JSON.parse(text);
			    window.that.json=JSON.parse(text);
			    console.log('->',json);
			    var data={
			    	values:[].concat(json)
			    };
			    for (var i=0;i<data.values.length;i++)
                {
                	data.values[i].id=String(Date.now());
                	data.values[i].certdate=data.values[i].certdate.substring(0,4)+"."+data.values[i].certdate.substring(4,6)+"."+data.values[i].certdate.substring(6,8);
                }
			    oModel.setData(data);
			    this.getView().byId("saveToBlockchain").setEnabled(true);
			}.bind(this);
			 
			reader.onerror = function(event) {
			    console.error("Файл не может быть прочитан!");
			}.bind(this);
			reader.readAsText(oEvent.getParameters().files[0]);
		},
		saveCertToChain:function(fileExists){
			sap.ui.core.BusyIndicator.show();
			var data = this.getView().getModel('main').getData();
			data=data.values[0];
			data.certdate=data.certdate.replace(/\./gi,'');
			$.ajax({
				url:"../certsave",
				data:JSON.stringify(data),
				dataType:"text",
				method:"POST"
			})
			.done(function( data ) {
				var success=true;
				if (data.length>0)
				{
					try 
					{
						data=JSON.parse(data);
					}
					catch{
						success=false;
					}
				}
				if (!success)
				{
					sap.m.MessageToast.show("Ошибка");
				}
				else
				{
					if (typeof(data.error)!="undefined")
					{
						sap.m.MessageToast.show(data.error.code+' ' + data.error.status+': '+data.error.message);
					}
					else
					{
						sap.ui.core.BusyIndicator.hide();
						sap.m.MessageToast.show("Сертификат загружен в блокчейн!");
						window.that.printForm=undefined;
						window.that.json=undefined;
						window.that.getView().setModel(new JSONModel());
						window.that.getView().byId("fileUploader").setValue();
						window.that.getView().byId("fileUploaderCertFrom").setValue();
					}
				}
			})
			.fail(function(data){
				sap.m.MessageToast.show("Error: Not Saved");
				sap.ui.core.BusyIndicator.hide();
			});
			sap.ui.core.BusyIndicator.hide();
		}
	});
});