sap.ui.define([ 
	'jquery.sap.global',
	'sap/suite/ui/commons/library',
	'sap/ui/core/mvc/Controller',
	'sap/ui/model/json/JSONModel',
	'sap/m/MessageToast',
	"./libs/instascan",
	"sap/m/HBox",
	"sap/m/VBox",
	"sap/m/Button",
	"sap/m/Dialog",
	"./libs/sha256.min"],
	function(jQuery, SuiteLibrary, Controller, JSONModel, MessageToast,Instascan,HBox,VBox,Button,Dialog,sha256) {
	"use strict";

	return Controller.extend("sap.suite.ui.commons.sample.Blockchain.Main", {
		onInit: function() {
			var oView = this.getView();

		},
		companyChange:function(e){
			var manufacturercode = this.getView().byId('manufacturercode');
			var cxt = e.getParameter('selectedItem').getBindingContext("company");
			manufacturercode.bindItems({
				path: 'company>'+cxt.getPath() + '/items',
				template: new sap.ui.core.Item({
				  key: '{company>key}',
				  text: '{company>text}'
				})
			  });
		},
		onPress:function(e){

			grecaptcha.ready(function() {
				grecaptcha.execute('6LfVRMsUAAAAAGlD3uUU9tfjIZnsePx9qh8jUUma', {action: 'homepage'}).then(function(token) {
					//console.log('token',token);
					try{
						var captcha=grecaptcha.getResponse();
					}
					catch(e){
						var captcha="";
					}
					
					var cert = this.getView().byId('certnumber').getValue();
					var certdate = this.getView().byId('certdate').getValue();
					var certcheckcode = this.getView().byId('certcheckcode').getValue();
					var manufacturercode = this.getView().byId('manufacturercode').getSelectedKey();
					var companycode = this.getView().byId('companycode').getSelectedKey();
					
					//check cert format
					/*if (!(/^\d+$/gi).test(String(cert)))
					{
						MessageToast.show('Неверный формат сертификата');
						return;
					}*/
					//var url='/api/getcert/'+cert;
					var url='';
					if (certdate.length==8&&certcheckcode.length>0&&manufacturercode.length>0)
					{
						//url='/api/findcert/'+cert+'/'+certdate+'/'+manufacturercode+'/'+certcheckcode+'/'+companycode;
						url='/api/certbyhash/'+window.sha256(cert+'|'+certdate+'|'+manufacturercode+'|'+companycode+'|'+certcheckcode);
					}
					else return;
					//request certs
					var xhr = new XMLHttpRequest();
					xhr.open("POST", url, true);
					xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
					xhr.onreadystatechange = function () {
						if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
							//console.log('success -> ',xhr.responseText);
							var result = JSON.parse(xhr.responseText);
							/*for (var i=0;i<result.values.length;i++)
							{
								result.values[i].certdate=result.values[i].certdate.substring(0,4)+"."+result.values[i].certdate.substring(4,6)+"."+result.values[i].certdate.substring(6,8);
							}*/
							if (result&&result.values)
							{
								var status=this.getView().getModel("status").getData();
								result.values.forEach(function(item){
									status.forEach(function(st){
										if (item.status===st.code)
										{
											item.status=st.name;
										}
									});
								});
							}
							var model=this.getView().getModel("main");
							model.setData(result);
							/*var oTable=this.byId('idProductsTable');
							oTable.setModel(model);*/
							sap.ui.core.BusyIndicator.hide();
							try{
								grecaptcha.reset();
							}
							catch(e){

							}
							if (typeof result.error!="undefined"&&result.error)
							{
								MessageToast.show(result.errorMsg);
								if (result.error_code=="captcha"){
									try{
										grecaptcha.render('gcaptcha', {'sitekey' : '6LcESMsUAAAAAPquC2bkwlwIBzkcTnLXyjzXTktj'});
									}
									catch(e){

									}
								}
							}
						} else if (xhr.status != 200) {
							console.log('fail -> ',xhr);
							sap.ui.core.BusyIndicator.hide();
						}
					}.bind(this);
					sap.ui.core.BusyIndicator.show();
					xhr.send(JSON.stringify({token:token,captcha:captcha}));

				}.bind(this));
			}.bind(this));
		},

		//qr reader
		qrDialog:null,
		qrScanner:null,
		cameras:null,
		selectedCamera:0,
		cameraButtonContainer:null,
		changeCamera:function(oEvent){
			console.log(oEvent);
			this.selectedCamera = Number(oEvent.getParameter('id').replace('CAM_',''));
			this.qrScanner.stop();
			delete this.qrScanner;
			this.runCamera();
		},
		onQR:function(oEvent){
			var qr_container="qr_container";
			if (!this.qrDialog) {
				var container=new VBox(qr_container);
				var video = new sap.ui.core.HTML("preview", {
                			content:"<video id=\"preview\"></video>"});
                container.addItem(video);
                this.cameraButtonContainer = new HBox();
                container.addItem(this.cameraButtonContainer);
				this.qrDialog = new Dialog({
					title: 'Просканируйте QR код',
					content: container,
					beginButton: new Button({
						text: 'Отменить',
						press: function () {
							this.qrDialog.close();
						}.bind(this)
					})
				});
				//to get access to the global model
				this.getView().addDependent(this.qrDialog);
			}
			this.qrDialog.open();
			this.runCamera();
			
		},
		runCamera:function(){
			if (!this.qrScanner)
			{
				this.qrScanner = new window.Instascan.Scanner({ video: document.getElementById('preview'),mirror: false,scanPeriod: 1});
				this.qrScanner.addListener('scan', function (content) {
			        console.log(content);
			        //this.getReplies("Покажи сертификат "+content);
		        	//scanned id
		        	this.getView().byId('certdate').setValue('');
		        	this.getView().byId('companycode').setValue('');
		        	this.getView().byId('certcheckcode').setValue('');
		        	this.getView().byId('manufacturercode').setValue('');
		        	this.getView().byId('certnumber').setValue(content);

			        this.qrScanner.stop();
			        this.qrDialog.close();

			        this.onPress();
				}.bind(this));
		    	window.Instascan.Camera.getCameras().then
		    	(
		    		function (cameras) {
		    			console.log(cameras);
						if (cameras.length > 0) {
							this.cameras=cameras;
							this.qrScanner.start(cameras[this.selectedCamera]);
							this.cameras.forEach(function(item,index){
								try{
									this.cameraButtonContainer.addItem(new Button("CAM_"+index,{
										text: "Камера "+(index+1),
										press: function (oEvent){this.changeCamera(oEvent);}.bind(this),
										width:'100%'
									}));
								}
								catch(ex)
								{

								}
							}.bind(this));
						} else {
							console.error('No cameras found.');
						}
					}.bind(this)
				).catch(
					function (e) {
						console.error(e);
					}
				);
			}
			else
			{
				this.qrScanner.start(this.cameras[this.selectedCamera]);
			}
		}
	});
});
