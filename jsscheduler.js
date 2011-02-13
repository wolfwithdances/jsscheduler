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
	this.element_ = $(element).first();
	this.options_ = $.extend({}, this.defaultOptions, options);
	this.rowLabels_ = [];
	this.columns_ = [];
	this.leftElement_ = null;
	this.topElement_ = null;
	this.gridElement_ = null;
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
	this.createBlocks_();
};

/** @private */
Schedule.prototype.emptyAllElements_ = function() {
	this.element_.find().each(function(x) {
		x.parentElement.removeChild(x);
	});
};

/** @private */
Schedule.prototype.resize_ = function() {
	this.element_.css({
		width: px(this.options_.leftWidth + this.columns_.length * this.options_.columnWidth),
		height: px(this.options_.topHeight + this.rowLabels_.length * this.options_.rowHeight)
	});
};

/** @private */
Schedule.prototype.createFrame_ = function() {
	this.leftElement_ = $(document.createElement("div"))
		.addClass("schedule_headerleft")
		.css({
			top: px(this.options_.topHeight),
			width: px(this.options_.leftWidth)
		});
	this.topElement_ = $(document.createElement("div"))
		.addClass("schedule_headertop")
		.css({
			height: px(this.options_.topHeight),
			left: px(this.options_.leftWidth)
		});
	this.topAxisLabelElement_ = $(document.createElement("div"))
		.addClass("schedule_topaxislabel")
		.text(this.options_.topAxisTitle)
		.appendTo(this.topElement_);
	this.gridElement_ = $(document.createElement("div"))
		.addClass("schedule_grid")
		.css({
			left: px(this.options_.leftWidth),
			top: px(this.options_.topHeight)
		});
	this.element_.append(this.leftElement_);
	this.element_.append(this.topElement_);
	this.element_.append(this.gridElement_);
};

/** @private */
Schedule.prototype.createRowHeaders_ = function() {
	for (var rowIndex = 0; rowIndex < this.rowLabels_.length; rowIndex += 1) {
		var rowHeader = $(document.createElement("div"))
			.addClass("schedule_leftheadercell")
			.css({
				top: px(rowIndex * this.options_.rowHeight),
				height: px(this.options_.rowHeight)
			})
			.text((rowIndex < this.rowLabels_.length) ? this.rowLabels_[rowIndex] : '')
			.appendTo(this.leftElement_);
	}
};

/** @private */
Schedule.prototype.createBlocks_ = function() {
	// add columns
	for (var colIndex = 0; colIndex < this.columns_.length; colIndex += 1) {
		var column = this.columns_[colIndex];
		column.createHeader(this, colIndex);
		column.updateLayout(this);
		
		var colBlocks = column.blocks_;
		for (var blockIndex in colBlocks) {
			var block = colBlocks[blockIndex];
			var blockElement = $(document.createElement("div"))
				.addClass("schedule_gridcell")
				.addClass(block.options_.cssClass)
				.css({
					backgroundColor: block.options_.borderColor,
					color: block.options_.labelTextColor,
					left: px(this.options_.columnWidth * colIndex + block.leftOffset_),
					top: px(this.options_.rowHeight * block.row_),
					width: px(this.options_.columnWidth - this.options_.cellMargin - block.leftOffset_ - block.rightOffset_),
					height: px(block.height_ * this.options_.rowHeight - this.options_.cellMargin),
					display: block.options_.visible ? "block" : "none"
				});
			if (block.height_ > 1) {
				$(document.createElement("div"))
					.addClass("schedule_cellcaption")
					.text(block.label_)
					.appendTo(blockElement);
				$(document.createElement("div"))
					.addClass("schedule_cellbody")
					.css({
						backgroundColor: block.options_.interiorColor,
						color: block.options_.textColor
					})
					.text(block.main_)
					.appendTo(blockElement);
			} else {
				$(document.createElement("div"))
					.addClass("label")
					.text(block.main_)
					.appendTo(blockElement);
				$(document.createElement("div"))
					.addClass("main")
					.appendTo(blockElement);
			}
			if (!block.options_.enabled) {
				blockElement.addClass("disabled");
			}
			if (block.link_) {
				blockElement.click({ block: block }, function(evt) {
					location.href = evt.data.block.link_;
				});
			}
			blockElement.mouseenter({ blockElement: blockElement }, function(evt) {
				evt.data.blockElement.addClass("hover");
			});
			blockElement.mouseleave({ blockElement: blockElement }, function(evt) {
				evt.data.blockElement.removeClass("hover");
			});
			
			block.element_ = blockElement;
			this.gridElement_.append(blockElement);
		}
	}
};

/**
 * Creates a Column object.
 * 
 * @param {any} id An ID used to map columns to locations.
 * @param {String} label Column title.
 * @param {String=} link URL to which the column header should link.
 * @param {Object} options A hash of options. 
 * @constructor
 */
Column = function(id, label, link, options) {
	this.id_ = id;
	this.label_ = label;
	this.link_ = link;
	this.options_ = $.extend({}, this.defaultOptions, this.options);
	this.blocks_ = [];
	this.element_ = null;
	this.visible_ = true;
	this.currentIndex_ = -1;
};

Column.prototype.defaultOptions = {
};

Column.prototype.createHeader = function(schedule, colIndex) {
	if (this.element_) {
		this.element_.parentElement.removeChild(this.element_);
	}
	
	var columnHeader = $(document.createElement("div"))
		.addClass("schedule_topheadercell")
		.css({
			left: px(colIndex * schedule.options_.columnWidth),
			width: px(schedule.options_.columnWidth)
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
	schedule.topElement_.append(columnHeader);
};

Column.prototype.updateLayout = function(schedule) {
	var rowData = [];
	for (var i = 0, len = schedule.rowLabels_.length; i < len; i += 1) {
		rowData[i] = [];
	}
	for (var blockIndex in this.blocks_) {
		var block = this.blocks_[blockIndex];
		
		block.subColumnId_ = -1;
		for (var i = block.row_, j = block.row_ + block.height_; i < j; i += 1) {
			rowData[i].push(block);
		}
	}
	
	var maxCrowding = 0;
	
	for (var i = 0; i < schedule.rowLabels_.length; i += 1) {
		for (var rowBlockIndex in rowData[i]) {
			var rowBlock = rowData[i][rowBlockIndex];
			if (rowBlock.subColumnId_ == -1) {
				var proposedSubColumn = 0;
				while (true) {
					var success = true;
					for (var j = 0; j < rowData[i].length; j += 1) {
						if (rowData[i][j].subColumnId_ == proposedSubColumn) {
							success = false;
							break;
						}
					}
					if (success) {
						break;
					}
					proposedSubColumn += 1;
				}
				rowBlock.subColumnId_ = proposedSubColumn;
				maxCrowding = Math.max(maxCrowding, proposedSubColumn);
			}
		}
	}
	
	for (var blockIndex in this.blocks_) {
		var block = this.blocks_[blockIndex];
		block.leftOffset_ = block.subColumnId_ * schedule.options_.adjacentStep;
		block.rightOffset_ = (maxCrowding - block.subColumnId_) * schedule.options_.adjacentStep;
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
	this.label_ = label;
	this.main_ = main;
	this.row_ = row;
	this.height_ = height;
	this.link_ = link;
	this.options_ = $.extend({}, this.defaultOptions, options);
	
	this.element_ = null;
	this.leftOffset_ = 0;
	this.rightOffset_ = 0;
	this.subColumnId_ = 0;
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

function px(value) {
	return String(Math.round(value)) + "px";
}

})(jQuery);
