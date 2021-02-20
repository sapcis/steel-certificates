/* global Instascan:true */
sap.ui.define([
	"jquery.sap.global",
	"sap/m/MessageToast",
	"sap/ui/core/format/DateFormat",
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/HBox",
	"sap/m/VBox",
	"sap/m/CustomListItem",
	"sap/m/Label",
	"sap/ui/core/Icon",
	"sap/m/Text",
	"sap/m/Link",
	"sap/m/Button",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"sap/ui/unified/Calendar",
	"../controller/formatter",
	"../libs/instascan",
	"sap/m/Dialog",
], function (jQuery, MessageToast, DateFormat, Controller, JSONModel, HBox, VBox, CustomListItem, Label, Icon, Text, Link, Button,
	MessageBox,
	Fragment, Calendar, formatter,Instascan,Dialog) {
	"use strict";

	return Controller.extend("botui.BotUI5.controller.Main", {
		botName: "mvideo",
		userName: "User:",
		chatbotName: "ChatBot:",
		userIcon: "sap-icon://employee",
		chatbotIcon: "/image/m-logo.png",
		startDate: null,
		finishDate: null,
		conversationI: null,
		senderUser: "user",
		senderBot: "chatbot",
		formatter: formatter,
		recognition: null,

		onInit: function() {
			var oModel = new JSONModel();
			this.getView().setModel(oModel);
			window.oView = this.getView();
			window.that = this;
			this.oFormatYyyymmdd = sap.ui.core.format.DateFormat.getInstance({
				pattern: "yyyy-MM-dd",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
			this.startConversation();
			this.checkMicrophone();
		},

		onAfterRendering: function() {
			var that = this;

			// this.getView().byId("oList").addEventDelegate({
			// 	onAfterRendering: function() {
			// 		var oLength = this.getView().byId("oList").getAggregation("items").length - 1;
			// 		this.getView().byId("oList").getAggregation("items")[oLength].focus();

			// 	}.bind(this)
			// });
			var oFormat = DateFormat.getDateTimeInstance(),
				oDate = new Date(),
				sDate = oFormat.format(oDate);

			this.getView().byId("timeStamp").setText(sDate);

			this.getView().byId("fi").onsapenter = (function(oEvent) {
				var lineText = this.getView().byId("fi").getValue();
				if (lineText !== undefined && lineText.trim() !== "")
					this.onPost(lineText);
				//this.onPost(this.getView().byId("fi").getValue());
			}.bind(this));

			this.getView().byId("fi").onselect = (function(oEvent) {
				this.onPost(this.getView().byId("fi").getValue());
			}.bind(this));

		},
		
		//url: "/cb/session?tag=" + this.botName.toUpperCase(),
		startConversation: function() {
			var that = this;
			$.ajax({
				method: "GET",
				url:"/cb/getnewconversation",
				contentType: "application/json",
				success: function(oData) {
					that.conversationId = oData.results.id;
					that._drawChatBot(that.senderBot, oData.message, "text");
					jQuery.sap.delayedCall(0, this, function() {
						that.getView().byId("fi").focus();
					});

				}.bind(this),
				error: function(error) {
					var errorMsg =
						"Добрый день! К сожалению, чат-бот временно недоступен. При необходимости обратитесь за помощью к Грицай Дмитрию (dmitrii.gritsai@sap.com).";
					that._drawChatBot(that.senderBot, errorMsg, "text");
				}
			});

		},

		getReplies: function(text) {
			text = text.charAt(0).toUpperCase() + text.substr(1);

			if (!this.getView().byId("fi").getEnabled()) {
				this.getView().byId("fi").setEnabled(true);
			}
			var that = this;
			var data = {
				"message": {
					"content": text,
					"type": "text",
					"check": false,
					"currentStage": null,
					"editParameter": null
				},
				"conversation_id": this.conversationId,
				"id": this.conversationId
			};
			if (!this.getView().getModel().getData().data || this.getView().getModel().getData().data.length === 0) {
				data.message.check = true;
			} else {
				data.message.currentStage = this.getView().getModel().getData().results.conversation.memory.stage;
				for (var i = 0; i < this.getView().getModel().getData().data.length; i++) {
					if (data.message.check) {
						break;
					} else {
						if (text === this.getView().getModel().getData().data[i].value) {
							data.message.check = true;
						}
					}
				}
				if (this.getView().getModel().getData().results.conversation.memory.editParameter) {
					data.message.editParameter = this.getView().getModel().getData().results.conversation.memory.editParameter;
				}
			}
			if (text === "Отменить") {
				data.message.check = true;
				data.message.currentStage = null;
			}
			//url: "/cb/" + this.botName,
			$.ajax({
				method: "POST",
				url: "/cb/sendmessage",
				contentType: "application/json",
				async: true,
				data: JSON.stringify(data),
				success: function(oData) {
					this.getView().getModel().setData(oData);
					for (var index = 0; index < oData.results.messages.length; index++) {
						switch (oData.results.messages[index].type) {
							case "text":
								that._drawChatBot(that.senderBot, oData.results.messages[index].content, oData.results.messages[index].type);
								break;
							case "date":
								that.getView().byId("fi").setEnabled(false);
								that._drawChatBot(that.senderBot, oData.results.messages[index].content, "text");
								that._drawChatBot(that.senderBot, null, oData.results.messages[index].type);
								break;
							case "quickReplies":
								that.getView().byId("fi").setEnabled(false);
								that._drawChatBot(that.senderBot, oData.results.messages[index].content, oData.results.messages[index].type);
								break;
							case "url":
								that.getView().byId("fi").setEnabled(false);
								that._drawChatBot(that.senderBot, oData.results.messages[index], oData.results.messages[index].type);
								break;
							case "list":
								//that.getView().byId("fi").setEnabled(false);
								that._drawChatBot(that.senderBot, oData.results.messages[index], oData.results.messages[index].type);
								break;
						}

					}
					var dateString = "date";
					if (oData.results.conversation) {
						if (oData.results.conversation.memory.stage) {
							if (oData.results.conversation.memory.stage.includes(dateString)) {
								that.getView().byId("fi").setEnabled(false);
								that._drawChatBot(that.senderBot, null, dateString);
							}
						}
					}
					// if (oData.results.conversation.memory.stage.includes("check")) {
					// 	// that.getView().byId("fi").setEnabled(false);
					// }

					jQuery.sap.delayedCall(0, this, function() {
						that.getView().byId("fi").focus();
					});

				}.bind(this),
				error: function(error) {
					debugger;
				}
			});
		},

		onPost: function(sText) {
			if (typeof sText !="undefined" && sText!=null && sText.length>0)
			{
				this._drawChatBot(this.senderUser, sText, "text");
				this.getReplies(sText);
				this.getView().byId("fi").setValue(null);
			}
			//AJAX QUERY TO THE SERVICE

			// this._drawChatBot("chatbot", "Добрый день!", "button");
			// this._drawChatBot("user", "Я хочу оформить командировку в Рязань", "string");
			// //this._drawChatBot("chatbot", "Добрый день!", "string");
			// this._drawChatBot("chatbot", "Выберите дату", "date");
			// this._drawChatBot("chatbot", "Выберите дату", "date");

		},

		_drawChatBot: function(sender, text, messageType) {

			var handleCalendarSelect = function(oEvent) {
				this.date = null;
				var aSelectedDates = oEvent.getSource().getSelectedDates();
				var oDate;
				if (aSelectedDates.length > 0) {
					oDate = aSelectedDates[0].getStartDate();
					if (oDate) {
						this.date = window.that.oFormatYyyymmdd.format(oDate);
					}
				}
				if (this.date !== null) {
					var text = this.date;
					window.that._drawChatBot("user", text, "text");
					window.that.getReplies(text);

				}
				oEvent.getSource().detachSelect(handleCalendarSelect);

			};

			var that = this;
			var name;
			var oItem = new CustomListItem();

			var oIconDocument = new Icon({
				src: "sap-icon://document-text"
			});

			if (sender === this.senderUser) {
				name = this.userName;
				var _icon = new Icon({
					src: this.userIcon
				});

			} else {
				name = this.chatbotName;
				_icon = new sap.m.Image({
					src: this.chatbotIcon
				});
			}

			var oFormat = DateFormat.getTimeInstance(),
				oDate = new Date(),
				sDate = oFormat.format(oDate);
			// create new entry

			var _fullBox = new HBox();
			_fullBox.addStyleClass("custFeedListItem");

			_icon.addStyleClass("custListItemFigure");

			var firstLine = new HBox();
			var _name = new Label({
				text: name
			});
			_name.addStyleClass("custListItemTextName");

			var _text = null;
			if (messageType === "list"||(messageType==="text"&& typeof(text.content)!="undefined"&& typeof(text.content.json)!="undefined")) {
				if (typeof(text.content.json)!="undefined")
				{
					var oModel = new sap.ui.model.json.JSONModel();
					var data = text.content.json.map(function(item){ 
						item.validity=item.validity.substring(0,4)+"."+ item.validity.substring(4,6)+"."+ item.validity.substring(6,8);
						return item;
					});
    				oModel.setData(text.content.json);
					var oTable = new sap.m.Table({
						columns: [
							new sap.m.Column({
								header: new sap.m.Label({
									text: "Сертификат"
								})
							}),
							new sap.m.Column({
								header: new sap.m.Label({
									text: "Дата отгрузки"
								})
							}),
							new sap.m.Column({
								header: new sap.m.Label({
									text: "Поставщик"
								})
							}),
							new sap.m.Column({
								header: new sap.m.Label({
									text: "Получатель"
								})
							}),
							new sap.m.Column({
								header: new sap.m.Label({
									text: "Номер заказа"
								})
							}),
							new sap.m.Column({
								header: new sap.m.Label({
									text: "Номер пакета"
								})
							}),
							new sap.m.Column({
								header: new sap.m.Label({
									text: "Торг 12"
								})
							}),
							new sap.m.Column({
								header: new sap.m.Label({
									text: "Скачать"
								})
							})
						],
						items: {
							path: '/',
							template: new sap.m.ColumnListItem({
								cells: [
									new sap.m.Text({
										text: "{serialnumber}"
									}),
									new sap.m.Text({
										text: "{validity}"
									}),
									new sap.m.Text({
										text: "{subject}"
									}),
									new sap.m.Text({
										text: "{customer}"
									}),
									new sap.m.Text({
										text: "{order}"
									}),
									new sap.m.Text({
										text: "{pkgnumber}"
									}),
									new sap.m.Text({
										text: "{torg12}"
									}),
									new sap.m.Link({
										href: "{url}",
										text: "Ссылка",
										target:"_blank",
										visible:"{=${url}.length>0}"
									})
								]
							})
						}
					});
					oTable.setModel(oModel);
					oTable.setWidth("1000px");
					firstLine.addItem(oTable);
				}
				else
				{
					var _list = new sap.m.List();
					var _listItem;
					text.content.elements.forEach(function(item){
						_listItem = new sap.m.StandardListItem({title:item.title,description:item.subtitle});
						_listItem.addStyleClass("sapUiSmallMarginBeginEnd");
						_listItem.addStyleClass("paddingTop05");
						_list.addItem(_listItem);
					});
					/*_text.addStyleClass("sapUiSmallMarginBeginEnd");
					_text.addStyleClass("paddingTop05");*/
					firstLine.addItem(_list );
				}
			}
			if ((messageType === "text"&&typeof(text.content)=="undefined") || messageType === "date") {
				_text = new sap.m.Text({
					text: text
				});
				_text.addStyleClass("sapUiSmallMarginBeginEnd");
				_text.addStyleClass("paddingTop05");
				firstLine.addItem(_text);
			}
			if (messageType === "quickReplies") {
				_text = new sap.m.Text({
					text: text.title
				});
				_text.addStyleClass("sapUiSmallMarginBeginEnd");
				_text.addStyleClass("paddingTop05");
				firstLine.addItem(_text);
			}

			var _footer = new Text({
				text: sDate
			});
			_footer.addStyleClass("sapUiSmallMarginBeginEnd");

			_footer.addStyleClass("custListItemFooter");

			var chatBox = new VBox();
			chatBox.addStyleClass("sapUiTinyMarginBegin");

			chatBox.addItem(firstLine);

			if (messageType === "date") {
				var _calendar = new Calendar({
					// select: ,
					intervalSelection: false
				});
				_calendar.attachSelect(handleCalendarSelect);
				chatBox.addItem(_calendar);
			}

			if (messageType === "quickReplies") {
				var _btnContainer = new HBox();
				for (var i = 0; i < text.buttons.length; i++) {
					var _btn1 = new Button({
						text: text.buttons[i].title,
						style: "sapUiResponsiveMargin",
						press: function(oEvent) {
							that._pressBtn(oEvent);
						}
					});
					if (i !== 0) {
						_btn1.addStyleClass("sapUiTinyMarginBeginEnd");
					}
					_btnContainer.addItem(_btn1);
				}
				chatBox.addItem(_btnContainer);
			}

			if (messageType === "url") {
				var _btnContainer = new sap.m.FlexBox({
					alignItems: "Center",
					justifyContent: "Center"
				});
				var _btn1 = new Button({
					icon: "sap-icon://document-text",
					style: "sapUiResponsiveMargin",
					press: function() {
						that._openDocument(text.content);
					}
				});
				_btn1.addStyleClass("sapUiSmallMarginBegin sapUiTinyMarginTop");
				var docTitle = new sap.m.Text({
					text: text.fileName
				});

				docTitle.addStyleClass("sapUiSmallMarginBeginEnd sapUiTinyMarginTop");

				_btnContainer.addItem(_btn1);
				_btnContainer.addItem(docTitle);

				chatBox.addItem(_btnContainer);
			}

			chatBox.addItem(_footer);

			if (sender === this.senderUser) {
				chatBox.addStyleClass("beautyUserBackground");
				_fullBox.addItem(chatBox);
				_fullBox.addItem(_icon);
				_fullBox.setJustifyContent("End");
				_text.addStyleClass("colorWhite");
				_footer.addStyleClass("colorWhite");

			} else {
				chatBox.addStyleClass("beautyBackground");
				_fullBox.addItem(_icon);
				_fullBox.addItem(chatBox);

			}

			oItem.addContent(_fullBox);

			this.getView().byId("oList").addItem(oItem);
			// 		jQuery.sap.delayedCall(0, this, function() {
			//   that.getView().byId("fi").focus();
			//});
			jQuery.sap.delayedCall(0, this, function() {
				oItem.focus();
				that.getView().byId("fi").focus();
			});

		},

		openCalendar: function(oEvent) {
			var that = this;
			if (!window.oView.getDependents()[0]) {
				window.that._oPopover = sap.ui.xmlfragment("ChatBot.fragment.Popover", window.that);
				window.oView.addDependent(window.that._oPopover);
			}
			window.that._oPopover.openBy(oEvent.getSource());
		},

		onClosePopover: function(oEvent) {
			oEvent.getSource().getParent().getParent().close();
		},

		_pressBtn: function(oEvent) {
			this.onPost(oEvent.getSource().getProperty("text"));
		},

		_openDocument: function(url) {
			window.open(url);
		},

		onSend: function() {
			var lineText = this.getView().byId("fi").getValue();
			if (lineText !== undefined && lineText.trim().length > 0)
				this.onPost(lineText);
		},

		onCheckDates: function(oEvent) {
			if (this.startDate !== null && this.finishDate !== null) {
				//AJAX TO THE SERVICE
				oEvent.getSource().getParent().getParent().close();
			} else if (this.startDate === null && this.finishDate !== null) {
				MessageBox.warning("Выберите дату начала командировки");
			} else if (this.startDate !== null && this.finishDate === null) {
				MessageBox.warning("Выберите дату окончания командировки");
			} else {
				MessageBox.warning("Выберите даты начала и окончания командировки");
			}

		},

		
		checkMicrophone: function() {
			var that = this;
			that.recognition={};
			try {
				var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
				that.recognition = new SpeechRecognition();
				that.recognition.lang = 'ru';
			} catch (e) {
				var errorMsg =
					"К сожалению, в вашем браузере отсутствует поддержка определения голоса.";
				that._drawChatBot(that.senderBot, errorMsg, "text");
				that.getView().byId("voiceBtn").setVisible(false);
			}

			that.recognition.onstart = function() {
				// var msg = 'Voice recognition activated. Try speaking into the microphone.';
				// that._drawChatBot(that.senderBot, msg, "text");
				that.getView().byId("voiceBtn").setEnabled(false);
			};

			that.recognition.onspeechend = function() {
				// var msg = 'You were quiet for a while so voice recognition turned itself off.';
				// that._drawChatBot(that.senderBot, msg, "text");
				that.getView().byId("voiceBtn").setEnabled(true);
				that.getView().byId("voiceBtn").setPressed(false);
			};

			that.recognition.onerror = function(event) {
				if (event.error == 'no-speech') {
					var msg = 'No speech was detected. Try again.';
					that._drawChatBot(that.senderBot, msg, "text");
				};
			};

			that.recognition.onresult = function(event) {
				// event is a SpeechRecognitionEvent object.
				// It holds all the lines we have captured so far. 
				// We only need the current one.
				var current = event.resultIndex;

				// Get a transcript of what was said.
				var transcript = event.results[current][0].transcript;

				// Add the current transcript to the contents of our Note.
				that.getView().byId("fi").setValue(that.getView().byId("fi").getValue() + transcript);
				that.getView().byId("fi").focus();
				that.onSend();
			};
		},
		
		onVoicePressed: function(oEvent){
			if(this.getView().byId("voiceBtn").getPressed() === true){ 
				this.recognition.start();
			}
		},
		qrDialog:null,
		qrScanner:null,
		cameras:null,
		selectedCamera:0,
		cameraButtonContainer:null,
		changeCamera:function(oEvent){
			console.log(oEvent);
			this.selectedCamera = Number(oEvent.getParameter('id').replace('CAM_',''));
			this.qrScanner.stop();
			this.qrScanner.start(this.cameras[this.selectedCamera]);
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
			if (!this.qrScanner)
			{
				this.qrScanner = new window.Instascan.Scanner({ video: document.getElementById('preview'),mirror: false,scanPeriod: 1});
				this.qrScanner.addListener('scan', function (content) {
			        console.log(content);
			        this.getReplies("Покажи сертификат "+content);
			        this.qrScanner.stop();
			        this.qrDialog.close();
				}.bind(this));
		    	window.Instascan.Camera.getCameras().then
		    	(
		    		function (cameras) {
		    			console.log(cameras);
						if (cameras.length > 0) {
							this.cameras=cameras;
							this.qrScanner.start(cameras[this.selectedCamera]);
							this.cameras.forEach(function(item,index){
								this.cameraButtonContainer.addItem(new Button("CAM_"+index,{
									text: "Камера "+(index+1),
									press: function (oEvent){this.changeCamera(oEvent);}.bind(this),
									width:'100%'
								}));
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