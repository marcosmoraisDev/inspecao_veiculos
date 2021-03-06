sap.ui.define(["sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"./utilities",
	"sap/ui/core/routing/History",
	"sap/ui/ux3/ToolPopup",
	'sap/ui/model/Filter',
	'sap/ui/model/json/JSONModel',
	'sap/ui/model/SimpleType',
	'sap/ui/model/ValidateException',
	'sap/m/MessageToast'
], function (BaseController, MessageBox, Utilities, History, ToolPopup, Filter, JSONModel, SimpleType, ValidateException, MessageToast) {
	"use strict";

	var caminho, cod, filtro, oStorage, gModelHelp;

	return BaseController.extend("com.sap.build.standard.formInspecaoDeVeiculos.controller.Identificacao", {

		handleRouteMatched: function (oEvent) {
			var oParams = {};

			oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);

			if (oStorage.get("Crud") !== null) {
				if (oStorage.get("Crud").operacao == "create") {
					if (oStorage.get("Crud").pageReset == "identificacao") {
						this.resetPage();
						oStorage.put("Crud", {
							operacao: "create",
							pageReset: "inspecao"
						});
					}
				} else if (oStorage.get("Crud").operacao == "update") {
					if (oStorage.get("Crud").pageReset == "identificacao") {
						var sPath = oStorage.get("Crud").sPath;
						this.preenchePage(sPath);
						oStorage.put("Crud", {
							operacao: "update",
							pageReset: "inspecao",
							sPath: sPath
						});
					}
				}
			}

			if (oEvent.mParameters.data.context) {
				this.sContext = oEvent.mParameters.data.context;
				var oPath;
				if (this.sContext) {
					oPath = {
						path: "/" + this.sContext,
						parameters: oParams
					};
					this.getView().bindObject(oPath);
				}
			}

		},

		preenchePage: function (sPath) {
			var oView = this.getView(),
				oModel = this.oView.getModel();

			caminho = "com.sap.build.standard.formInspecaoDeVeiculos.view.BusyDialog";
			var oDialog = sap.ui.xmlfragment(caminho, this);
			oDialog.open();

			oModel.read(sPath, {
				success: function (oData) {
					oView.byId("tratorInput").setValue(oData.Veiculo);
					oView.byId("motoristaInput").setValue(oData.Nome);
					oView.byId("reboque1Input").setValue(oData.Reboque1);
					oView.byId("reboque2Input").setValue(oData.Reboque2);
					oView.byId("reboque3Input").setValue(oData.Reboque3);
					oView.byId("tipoVeiculo").setSelectedKey(oData.TipoVeiculo);
					oView.byId("cpfInput").setValue(oData.Cpf);
					oDialog.close();
				},
				error: function (oError) {
					oDialog.close();
					MessageBox.error("erro ao prencheer campos");
					var rota = this.getOwnerComponent().getRouter();
					rota.navTo("Menu", false);
				}
			});
			this.ocultaReboque();
		},

		resetPage: function () {
			this.getView().byId("tratorInput").setValue("");
			this.getView().byId("motoristaInput").setValue("");
			this.getView().byId("reboque1Input").setValue("");
			this.getView().byId("reboque2Input").setValue("");
			this.getView().byId("reboque3Input").setValue("");
			this.getView().byId("cpfInput").setValue("");
			this.getView().byId("tipoVeiculo").setSelectedKey("04");
			this.ocultaReboque();
		},

		_onPageNavButtonPress: function () {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();
			var oQueryParams = this.getQueryParameters(window.location);

			if (sPreviousHash !== undefined || oQueryParams.navBackToLaunchpad) {
				window.history.go(-1);
			} else {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("default", true);
			}
		},
		getQueryParameters: function (oLocation) {
			var oQuery = {};
			var aParams = oLocation.search.substring(1).split("&");
			for (var i = 0; i < aParams.length; i++) {
				var aPair = aParams[i].split("=");
				oQuery[aPair[0]] = decodeURIComponent(aPair[1]);
			}
			return oQuery;
		},
		_onButtonPress: function (oEvent) {
			var oBindingContext = oEvent.getSource().getBindingContext();
			return new Promise(function (fnResolve) {
				this.doNavigate("Inspecao", oBindingContext, fnResolve, "");
			}.bind(this)).catch(function (err) {
				if (err !== undefined) {
					MessageBox.error(err.message);
				}
			});
		},
		_testaCPF: function (strCPF) {
			var Soma;
			var Resto;
			Soma = 0;
			var i;
			if (strCPF == "00000000000") return false;

			for (i = 1; i <= 9; i++) Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
			Resto = (Soma * 10) % 11;

			if ((Resto == 10) || (Resto == 11)) Resto = 0;
			if (Resto != parseInt(strCPF.substring(9, 10))) return false;

			Soma = 0;
			for (i = 1; i <= 10; i++) Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
			Resto = (Soma * 10) % 11;

			if ((Resto == 10) || (Resto == 11)) Resto = 0;
			if (Resto != parseInt(strCPF.substring(10, 11))) return false;
			return true;
		},

		_onContinue: function (oEvent) {
			var oView = this.getView();
			var aInputs = [
				oView.byId("tratorInput"),
				oView.byId("reboque1Input"),
				oView.byId("reboque2Input"),
				oView.byId("reboque3Input"),
				oView.byId("motoristaInput"),
				oView.byId("cpfInput")
			];

			//////

			var bValidationError = false;
			var regex = new RegExp("^[a-zA-Z]{3}[0-9]{4}|[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$");

			if (!this._testaCPF(this.getView().byId("cpfInput").getValue())) {
				bValidationError = true;
				this.getView().byId("cpfInput").setValueState("Error");
			}

			var tipoVeiculo = this.getView().byId("tipoVeiculo").getSelectedKey();

			for (var i = 0; i < aInputs.length; i++) {
				var id = aInputs[i].getId();

				if (id.search("tratorInput") !== -1) {
					if (!regex.test(aInputs[i].getValue())) {
						aInputs[i].setValueState("Error");
						bValidationError = true;
					}
				}

				if (tipoVeiculo == "02") {
					if (id.search("reboque1Input") !== -1) {
						if (!regex.test(aInputs[i].getValue())) {
							aInputs[i].setValueState("Error");
							bValidationError = true;
						}
					}
				} else if (tipoVeiculo == "03") {
					if (id.search("reboque1Input") !== -1) {
						if (!regex.test(aInputs[i].getValue())) {
							aInputs[i].setValueState("Error");
							bValidationError = true;
						}
					} else if (id.search("reboque2Input") !== -1) {
						if (!regex.test(aInputs[i].getValue())) {
							aInputs[i].setValueState("Error");
							bValidationError = true;
						}
					}
				} else if (tipoVeiculo == "04") {
					if (id.search("reboque1Input") !== -1) {
						if (!regex.test(aInputs[i].getValue())) {
							aInputs[i].setValueState("Error");
							bValidationError = true;
						}
					} else if (id.search("reboque2Input") !== -1) {
						if (!regex.test(aInputs[i].getValue())) {
							aInputs[i].setValueState("Error");
							bValidationError = true;
						}
					} else if (id.search("reboque3Input") !== -1) {
						if (!regex.test(aInputs[i].getValue())) {
							aInputs[i].setValueState("Error");
							bValidationError = true;
						}
					}
				}

				if (id.search("motoristaInput") !== -1) {
					if (aInputs[i].getValue() === "") {
						aInputs[i].setValueState("Error");
						bValidationError = true;
					}
				} else if (id.search("cpfInput") !== -1) {
					if (aInputs[i].getValue() === "") {
						aInputs[i].setValueState("Error");
						bValidationError = true;
					}
				}

			}

			////

			// var bValidationError = false;
			// var regex = new RegExp("^[a-zA-Z]{3}[0-9]{4}|[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$");

			// if (!this._testaCPF(this.getView().byId("cpfInput").getValue())) {
			// 	bValidationError = true;
			// 	this.getView().byId("cpfInput").setValueState("Error");
			// }

			// jQuery.each(aInputs, function (i, oInput) {

			// 	var id = oInput.getId();

			// 	if (id.search("tratorInput") !== -1) {
			// 		if (!regex.test(oInput.getValue())) {
			// 			oInput.setValueState("Error");
			// 			bValidationError = true;
			// 		}
			// 	} else if (id.search("reboque1Input") !== -1) {
			// 		if (oInput.getValue() !== "") {
			// 			if (!regex.test(oInput.getValue())) {
			// 				oInput.setValueState("Error");
			// 				bValidationError = true;
			// 			}
			// 		}
			// 	} else if (id.search("reboque2Input") !== -1) {
			// 		if (oInput.getValue() !== "") {
			// 			if (!regex.test(oInput.getValue())) {
			// 				oInput.setValueState("Error");
			// 				bValidationError = true;
			// 			}
			// 		}
			// 	} else if (id.search("reboque3Input") !== -1) {
			// 		if (oInput.getValue() !== "") {
			// 			if (!regex.test(oInput.getValue())) {
			// 				oInput.setValueState("Error");
			// 				bValidationError = true;
			// 			}
			// 		}
			// 	} else if (id.search("motoristaInput") !== -1) {
			// 		if (oInput.getValue() === "") {
			// 			oInput.setValueState("Error");
			// 			bValidationError = true;
			// 		}
			// 	} else if (id.search("cpfInput") !== -1) {
			// 		if (oInput.getValue() === "") {
			// 			oInput.setValueState("Error");
			// 			bValidationError = true;
			// 		}
			// 	}
			// });

			if (!bValidationError) {
				this._inputDados();
				this._onButtonPress(oEvent);
			} else {
				MessageBox.warning(
					"Os campos em destaquem precisam ser preenchidos, ou estão preenchidos incorretamente.\nAtente-se ao padrão: Placas = 'ABC1234' e CPF = '000.000.000-00'"
				);
			}
		},

		doNavigate: function (sRouteName, oBindingContext, fnPromiseResolve, sViaRelation) {
			var sPath = (oBindingContext) ? oBindingContext.getPath() : null;
			var oModel = (oBindingContext) ? oBindingContext.getModel() : null;

			var sEntityNameSet;
			if (sPath !== null && sPath !== "") {
				if (sPath.substring(0, 1) === "/") {
					sPath = sPath.substring(1);
				}
				sEntityNameSet = sPath.split("(")[0];
			}
			var sNavigationPropertyName;
			var sMasterContext = this.sMasterContext ? this.sMasterContext : sPath;

			if (sEntityNameSet !== null) {
				sNavigationPropertyName = sViaRelation || this.getOwnerComponent().getNavigationPropertyForNavigationWithContext(sEntityNameSet,
					sRouteName);
			}
			if (sNavigationPropertyName !== null && sNavigationPropertyName !== undefined) {
				if (sNavigationPropertyName === "") {
					this.oRouter.navTo(sRouteName, {
						context: sPath,
						masterContext: sMasterContext
					}, false);
				} else {
					oModel.createBindingContext(sNavigationPropertyName, oBindingContext, null, function (bindingContext) {
						if (bindingContext) {
							sPath = bindingContext.getPath();
							if (sPath.substring(0, 1) === "/") {
								sPath = sPath.substring(1);
							}
						} else {
							sPath = "undefined";
						}
						// If the navigation is a 1-n, sPath would be "undefined" as this is not supported in Build
						if (sPath === "undefined") {
							this.oRouter.navTo(sRouteName);
						} else {
							this.oRouter.navTo(sRouteName, {
								context: sPath,
								masterContext: sMasterContext
							}, false);
						}
					}.bind(this));
				}
			} else {
				this.oRouter.navTo(sRouteName);
			}

			if (typeof fnPromiseResolve === "function") {
				fnPromiseResolve();
			}

		},

		//Auxiliar de busca de itens dentro do sistema                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
		handleValueHelp: function (oEvent) {

			var sInputValue = oEvent.getSource().getValue();
			this.inputId = oEvent.getSource().getId();

			if (this.inputId.toString().indexOf("tratorInput") != -1) {
				caminho = "com.sap.build.standard.formInspecaoDeVeiculos.view.DialogVeiculo";
				filtro = "Placa";
			} else if ((this.inputId.toString().indexOf("reboque1Input") != -1) || (this.inputId.toString().indexOf("reboque2Input") != -1)) {
				caminho = "com.sap.build.standard.formInspecaoDeVeiculos.view.DialogReboque";
				filtro = "Placa";
			} else if (this.inputId.toString().indexOf("motoristaInput") != -1) {
				caminho = "com.sap.build.standard.formInspecaoDeVeiculos.view.DialogMotorista";
				filtro = "Name1";
			} else if (this.inputId.toString().indexOf("fornecedorInput") != -1) {
				caminho = "com.sap.build.standard.formInspecaoDeVeiculos.view.DialogFornecedor";
				filtro = "Name1";
			} else if (this.inputId.toString().indexOf("cpfInput") != -1) {
				caminho = "com.sap.build.standard.formInspecaoDeVeiculos.view.DialogCPF";
				filtro = "Stcd2";
			}

			this._valueHelpDialog = sap.ui.xmlfragment(caminho, this);
			this.getView().addDependent(this._valueHelpDialog);

			// create a filter for the binding
			this._valueHelpDialog.getBinding("items").filter([new Filter(
				filtro,
				sap.ui.model.FilterOperator.Contains, sInputValue
			)]);
			// open value help dialog filtered by the input value
			this._valueHelpDialog.open(sInputValue);
		},

		//Tornando a letra maiuscula
		_handleValueHelpSearch: function (evt) {
			var sValue = evt.getParameter("value");
			sValue = sValue.toUpperCase();
			var oFilter = new Filter(
				filtro,
				sap.ui.model.FilterOperator.Contains, sValue
			);
			evt.getSource().getBinding("items").filter([oFilter]);
		},

		_handleValueHelpClose: function (evt) {
			var productInput,
				placaReboque1 = "",
				placaReboque2 = "",
				placaReboque3 = "",
				reboque1Input, reboque2Input, reboque3Input, cpfInput, cpf = "",
				sValue;
			var oSelectedItem = evt.getParameter("selectedItem");
			if (oSelectedItem) {
				productInput = this.byId(this.inputId);
				sValue = oSelectedItem.getTitle();
			}
			gModelHelp = this.getView().getModel();
			reboque1Input = this.getView().byId("reboque1Input");
			reboque2Input = this.getView().byId("reboque2Input");
			reboque3Input = this.getView().byId("reboque3Input");
			cpfInput = this.getView().byId("cpfInput");
			if (this.inputId.toString().indexOf("tratorInput") != -1 && (oSelectedItem)) {
				placaReboque1 = gModelHelp.getData("/Veiculo('" + sValue + "')").Reboque1;
				placaReboque2 = gModelHelp.getData("/Veiculo('" + sValue + "')").Reboque2;
				placaReboque3 = gModelHelp.getData("/Veiculo('" + sValue + "')").Reboque3;
			}
			if (this.inputId.toString().indexOf("motoristaInput") != -1 && (oSelectedItem)) {
				cpf = gModelHelp.getData("/Motorista('" + sValue + "')").Stcd2;
				this.cod = gModelHelp.getData("/Motorista('" + sValue + "')").Lifnr;
			}
			productInput.setValue(sValue.toUpperCase());
			productInput.setValueState("None");
			if (placaReboque1 != "") {
				reboque1Input.setValue(placaReboque1.toUpperCase());
			}
			if (placaReboque2 != "") {
				reboque2Input.setValue(placaReboque2.toUpperCase());
			}
			if (placaReboque3 != "") {
				reboque3Input.setValue(placaReboque3.toUpperCase());
			}
			if (cpf != "") {
				cpfInput.setValue(cpf.toUpperCase());
			}
			reboque1Input.setValueState("None");
			reboque2Input.setValueState("None");
			reboque3Input.setValueState("None");
			cpfInput.setValueState("None");
			evt.getSource().getBinding("items").filter([]);
		},

		_handleLiveChange: function (oEvent) {
			this._handleValueHelpSearch(oEvent);
		},

		handleLiveChange: function (oEvent) {
			var id = oEvent.getParameter("id");
			var input = this.getView().byId(id);
			input.setValueState("None");
			input.setValue(input.getValue().toUpperCase());
		},

		ocultaReboque: function (oEvent) {
			if (this.getView().byId("tipoVeiculo").getSelectedKey() === "01") {
				this.getView().byId("reboque1Input").setVisible(false);
				this.getView().byId("reboque2Input").setVisible(false);
				this.getView().byId("reboque3Input").setVisible(false);
				this.getView().byId("reboque1Label").setVisible(false);
				this.getView().byId("reboque2Label").setVisible(false);
				this.getView().byId("reboque3Label").setVisible(false);
			} else if (this.getView().byId("tipoVeiculo").getSelectedKey() === "02") {
				this.getView().byId("reboque1Input").setVisible(true);
				this.getView().byId("reboque2Input").setVisible(false);
				this.getView().byId("reboque3Input").setVisible(false);
				this.getView().byId("reboque1Label").setVisible(true);
				this.getView().byId("reboque2Label").setVisible(false);
				this.getView().byId("reboque3Label").setVisible(false);
			} else if (this.getView().byId("tipoVeiculo").getSelectedKey() === "03") {
				this.getView().byId("reboque1Input").setVisible(true);
				this.getView().byId("reboque2Input").setVisible(true);
				this.getView().byId("reboque3Input").setVisible(false);
				this.getView().byId("reboque1Label").setVisible(true);
				this.getView().byId("reboque2Label").setVisible(true);
				this.getView().byId("reboque3Label").setVisible(false);
			} else if (this.getView().byId("tipoVeiculo").getSelectedKey() === "04") {
				this.getView().byId("reboque1Input").setVisible(true);
				this.getView().byId("reboque2Input").setVisible(true);
				this.getView().byId("reboque3Input").setVisible(true);
				this.getView().byId("reboque1Label").setVisible(true);
				this.getView().byId("reboque2Label").setVisible(true);
				this.getView().byId("reboque3Label").setVisible(true);
			}
		},

		onInit: function () {
			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this.oRouter.getTarget("Identificacao").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
		},

		_inputDados: function () {

			var reboque1 = "";
			var reboque2 = "";
			var reboque3 = "";

			if (this.getView().byId("tipoVeiculo").getSelectedKey() === "02") {
				reboque1 = this.getView().byId("reboque1Input").getValue();
			}
			if (this.getView().byId("tipoVeiculo").getSelectedKey() === "03") {
				reboque1 = this.getView().byId("reboque1Input").getValue();
				reboque2 = this.getView().byId("reboque2Input").getValue();
			}
			if (this.getView().byId("tipoVeiculo").getSelectedKey() === "04") {
				reboque1 = this.getView().byId("reboque1Input").getValue();
				reboque2 = this.getView().byId("reboque2Input").getValue();
				reboque3 = this.getView().byId("reboque3Input").getValue();
			}

			var dados = {
				tipoVeiculo: this.getView().byId("tipoVeiculo").getSelectedKey(),
				veiculo: this.getView().byId("tratorInput").getValue(),
				reboque1: reboque1,
				reboque2: reboque2,
				reboque3: reboque3,
				nome_motorista: this.getView().byId("motoristaInput").getValue(),
				cpf: this.getView().byId("cpfInput").getValue(),
				lifnr: this.cod
			};

			oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
			oStorage.put("identificacao", dados);
		},

		onMetadataLoaded: function (myODataModel) {
			myODataModel.setSizeLimit(1000000);
		}
	});
}, /* bExport= */ true);