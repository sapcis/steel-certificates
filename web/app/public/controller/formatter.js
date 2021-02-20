sap.ui.define([
	"sap/ui/core/format/NumberFormat"
], function(NumberFormat) {
	"use strict";

	return {

		FormatPeriod: function(period1) {
			if (period1 === null ) {
				return period1;
			} else {

				return period1.toLocaleDateString();
			}

		}

	};
});