/*
 * JSScheduler (c) 2011 Jeff Bowman
 * Released as part of Wepwawet under Apache license 2.0
 * Written for JQuery 1.5 - Originally coded for FurEvent
 */
(function($) {

/**
 * Creates a new JSSchedule element.
 * @param element A JQuery text selector.
 * @param options A hash of options.
 * @constructor
 */
Schedule = function(element, options) {
	/** @type {Element} */
	this.element_ = $(element).first();
	/** @type {Object} */
	this.options = $.extend({}, this.defaultOptions, options);
	/** @type {Array.<String>} */
	this.rowLabels = [];
	/** @type {Array.<Column>} */
	this.columns = [];
	/** @type {Element} */
	this.leftElement_ = null;
	/** @type {Element} */
	this.topElement_ = null;
	/** @type {Element} */
	this.gridElement_ = null;
	/** @type {Element} */
	this.topAxisLabelElement_ = null;
};

Schedule.prototype.defaultOptions = {
	rowHeight: 30,
	columnWidth: 110,
	leftWidth: 90,
	topHeight: 40,
	cellMargin: 1,
	adjacentStep: 10,
	topAxisTitle: "Tracks"
};

/** Removes and rerenders all elements. */
Schedule.prototype.render = function() {
	this.emptyAllElements_();
	this.resize_();
	this.createFrame_();
	this.createRowHeaders_();
	this.createColumns_();
};

/** @private */
Schedule.prototype.emptyAllElements_ = function() {
	this.element_.empty();
};

/** @private */
Schedule.prototype.resize_ = function() {
	this.element_.css({
		width: px(this.options.leftWidth + this.getVisibleColumns().length * this.options.columnWidth),
		height: px(this.options.topHeight + this.rowLabels.length * this.options.rowHeight)
	});
};

/** @private */
Schedule.prototype.createFrame_ = function() {
	this.leftElement_ = $(document.createElement("div"))
		.addClass("schedule_headerleft")
		.css({
			top: px(this.options.topHeight),
			width: px(this.options.leftWidth)
		});
	this.topElement_ = $(document.createElement("div"))
		.addClass("schedule_headertop")
		.css({
			height: px(this.options.topHeight),
			left: px(this.options.leftWidth)
		});
	this.topAxisLabelElement_ = $(document.createElement("div"))
		.addClass("schedule_topaxislabel")
		.text(this.options.topAxisTitle)
		.appendTo(this.topElement_);
	this.gridElement_ = $(document.createElement("div"))
		.addClass("schedule_grid")
		.css({
			left: px(this.options.leftWidth),
			top: px(this.options.topHeight)
		});
	this.element_.append(this.leftElement_);
	this.element_.append(this.topElement_);
	this.element_.append(this.gridElement_);
};

/** @private */
Schedule.prototype.createRowHeaders_ = function() {
	for (var rowIndex = 0; rowIndex < this.rowLabels.length; rowIndex += 1) {
		var rowHeader = $(document.createElement("div"))
			.addClass("schedule_leftheadercell")
			.css({
				top: px(rowIndex * this.options.rowHeight),
				height: px(this.options.rowHeight)
			})
			.text((rowIndex < this.rowLabels.length) ? this.rowLabels[rowIndex] : '')
			.appendTo(this.leftElement_);
	}
};

/** @private */
Schedule.prototype.createColumns_ = function() {
	/** @type {Array.<Column>} */
	var visibleColumns = this.getVisibleColumns();
	for (var index = 0; index < visibleColumns.length; index += 1) {
		var column = visibleColumns[index];
		column.schedule_ = this;
		column.index_ = index;
		column.render();
	}
};

/**
 * @private
 * @returns {Array.<Column>}
 */
Schedule.prototype.getVisibleColumns = function() {
	var visibleColumns = [];
	for (var index = 0; index < this.columns.length; index += 1) {
		var column = this.columns[index];
		if (column.options.visible) {
			visibleColumns.push(column);
		}
	}
	return visibleColumns;
};

/**
 * Creates a Column object.
 * 
 * @param {String} label Column title.
 * @param {String=} link URL to which the column header should link.
 * @param {Object} options A hash of options. 
 * @constructor
 */
Column = function(label, link, options) {
	/** @type {String} */
	this.label_ = label;
	/** @type {String} */
	this.link_ = link;
	/** @type {Object} */
	this.options = $.extend({}, this.defaultOptions, this.options);
	/** @type {Array.<Block>} */
	this.blocks = [];
	/** @type {Element} */
	this.element_ = null;
	/** @type {Schedule} */
	this.schedule_ = null;
	/** @type {Number} */
	this.index_ = -1;
};

Column.prototype.defaultOptions = {
	visible: true
};

Column.prototype.render = function() {
	this.createHeader_();
	this.updateLayout_();
	this.createBlocks_();
};

/** @private */
Column.prototype.createHeader_ = function() {
	if (this.element_ && this.element_.parentElement) {
		this.element_.parentElement.removeChild(this.element_);
	}
	
	var columnHeader = $(document.createElement("div"))
		.addClass("schedule_topheadercell")
		.css({
			left: px(this.index_ * this.schedule_.options.columnWidth),
			width: px(this.schedule_.options.columnWidth)
		});
	if (!this.link_) {
		columnHeader.text(this.label_);
	} else {
		var columnAnchor = $(document.createElement("a"))
			.attr("href", this.link_)
			.text(this.label_)
			.appendTo(columnHeader);
	}
	this.element_ = columnHeader;
	this.schedule_.topElement_.append(columnHeader);
};

/** @private */
Column.prototype.updateLayout_ = function() {
	/** @type {Array.<Array.<Block>>} */
	var rowData = [];
	for (var i = 0, len = this.schedule_.rowLabels.length; i < len; i += 1) {
		rowData[i] = [];
	}
	for (var blockIndex in this.blocks) {
		/** @type {Block} */
		var block = this.blocks[blockIndex];
		
		block.subColumnIndex_ = -1;
		for (var i = block.row_, j = block.row_ + block.height_; i < j; i += 1) {
			rowData[i].push(block);
		}
	}
	
	var maxSubColumnIndex = 0;
	
	for (var i = 0; i < this.schedule_.rowLabels.length; i += 1) {
		for (var rowBlockIndex in rowData[i]) {
			var rowBlock = rowData[i][rowBlockIndex];
			if (rowBlock.subColumnIndex_ == -1) {
				var proposedSubColumnIndex = 0;
				while (true) {
					var success = true;
					for (var j = 0; j < rowData[i].length; j += 1) {
						if (rowData[i][j].subColumnIndex_ == proposedSubColumnIndex) {
							success = false;
							break;
						}
					}
					if (success) {
						break;
					}
					proposedSubColumnIndex += 1;
				}
				rowBlock.subColumnIndex_ = proposedSubColumnIndex;
				maxSubColumnIndex = Math.max(maxSubColumnIndex, proposedSubColumnIndex);
			}
		}
	}
	
	for (var blockIndex in this.blocks) {
		var block = this.blocks[blockIndex];
		block.leftOffset_ = block.subColumnIndex_ * this.schedule_.options.adjacentStep;
		block.rightOffset_ = (maxSubColumnIndex - block.subColumnIndex_) * this.schedule_.options.adjacentStep;
	}
};

/** @private */
Column.prototype.createBlocks_ = function() {
	for (var blockIndex in this.blocks) {
		var block = this.blocks[blockIndex];
		block.schedule_ = this.schedule_;
		block.column_ = this;
		block.render();
	}
};

/**
 * @param {String} label The label that should go at the top of the block.
 * @param {String} main The text that should go inside the block.
 * @param {Number} row The first row that should contain the block.
 * @param {Number} height The total number or rows that the block should span.
 * @param {String} link URL to which the block should link.
 * @param {Object} options A hash of options.
 * @constructor
 */
Block = function(label, main, row, height, link, options) {
	/** @type {String} */
	this.label_ = label;
	/** @type {String} */
	this.main_ = main;
	/** @type {Number} */
	this.row_ = row;
	/** @type {Number} */
	this.height_ = height;
	/** @type {String} */
	this.link_ = link;
	/** @type {Object} */
	this.options = $.extend({}, this.defaultOptions, options);
	
	/** @type {Element} */
	this.element_ = null;
	/** @type {Schedule} */
	this.schedule_ = null;
	/** @type {Column} */
	this.column_ = null;
	/** @type {Number} */
	this.leftOffset_ = 0;
	/** @type {Number} */
	this.rightOffset_ = 0;
	/** @type {Number} */
	this.subColumnIndex_ = 0;
};

Block.prototype.defaultOptions = {
	borderColor: "#009",
	labelTextColor: "#fff",
	interiorColor: "#fff",
	textColor: "#000",
	enabled: true,
	visible: true,
	cssClass: ''
};

Block.prototype.render = function() {
	if (this.element_ && this.element_.parentElement) {
		this.element_.parentElement.removeChild(this.element_);
	}
	var blockElement = $(document.createElement("div"))
		.addClass("schedule_gridcell")
		.addClass(this.options.cssClass)
		.css({
			backgroundColor: this.options.borderColor,
			color: this.options.labelTextColor,
			left: px(this.schedule_.options.columnWidth * this.column_.index_ + this.leftOffset_),
			top: px(schedule.options.rowHeight * this.row_),
			width: px(schedule.options.columnWidth - schedule.options.cellMargin - this.leftOffset_ - this.rightOffset_),
			height: px(this.height_ * schedule.options.rowHeight - schedule.options.cellMargin),
			display: this.options.visible ? "block" : "none"
		});
	if (this.height_ > 1) {
		$(document.createElement("div"))
			.addClass("schedule_cellcaption")
			.text(this.label_)
			.appendTo(blockElement);
		$(document.createElement("div"))
			.addClass("schedule_cellbody")
			.css({
				backgroundColor: this.options.interiorColor,
				color: this.options.textColor
			})
			.text(this.main_)
			.appendTo(blockElement);
	} else {
		$(document.createElement("div"))
			.addClass("label")
			.text(this.main_)
			.appendTo(blockElement);
		$(document.createElement("div"))
			.addClass("main")
			.appendTo(blockElement);
	}
	if (!this.options.enabled) {
		blockElement.addClass("disabled");
	}
	if (this.link_) {
		blockElement.click({ block: this }, function(evt) {
			location.href = evt.data.block.link_;
		});
	}
	blockElement.mouseenter({ blockElement: blockElement }, function(evt) {
		evt.data.blockElement.addClass("hover");
	});
	blockElement.mouseleave({ blockElement: blockElement }, function(evt) {
		evt.data.blockElement.removeClass("hover");
	});
	
	this.element_ = blockElement;
	this.schedule_.gridElement_.append(blockElement);
};

/**
 * Returns the passed value as an integer number of pixels, suffixed with "px".
 */
function px(value) {
	return String(Math.round(value)) + "px";
}

})(jQuery);
