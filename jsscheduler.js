
(function($) {

function px(value) {
	return String(Math.round(value)) + "px";
}

/** @constructor */
Schedule = function(element) {
	this.element = $(element).first();
	this.columnWidth = 110;
	this.rowHeight = 30;
	this.leftWidth = 90; // const
	this.topHeight = 40; // const
	this.cellMargin = 1;
	this.rowLabels = [];
	this.columns = [];
	this.topAxisTitle = "Tracks";
	this.leftElement = null;
	this.topElement = null;
	this.gridElement = null;
	this.topAxisLabelElement = null;
	this.blocks = [];
	this.adjacentStep = 10;
}

Schedule.prototype.render = function() {
	$(this.element).find().each(function(x) {
		x.parentElement.removeChild(x);
	});
	$(this.element).css({
		width: px(this.leftWidth + this.columns.length * this.columnWidth),
		height: px(this.topHeight + this.rowLabels.length * this.rowHeight)
	});
	
	// create header elements
	this.leftElement = $(document.createElement("div"))
		.addClass("schedule_headerleft")
		.css({ top: px(this.topHeight), width: px(this.leftWidth) });
	this.topElement = $(document.createElement("div"))
		.addClass("schedule_headertop")
		.css({ height: px(this.topHeight), left: px(this.leftWidth) });
	this.topAxisLabelElement = $(document.createElement("div"))
		.addClass("schedule_topaxislabel")
		.text(this.topAxisTitle)
		.appendTo(this.topElement);
	this.gridElement = $(document.createElement("div"))
		.addClass("schedule_grid")
		.css({ "left": px(this.leftWidth), "top": px(this.topHeight) });
	
	// add row headers
	for(var rowIndex = 0, len = this.rowLabels.length; rowIndex < len; rowIndex += 1) {
		var rowHeader = $(document.createElement("div"))
			.addClass("schedule_leftheadercell")
			.css({ "top": px(rowIndex * this.rowHeight), "height": px(this.rowHeight) })
			.text((rowIndex < this.rowLabels.length) ? this.rowLabels[rowIndex] : '');
		this.leftElement.append(rowHeader);
	}
	
	var columnMap = {};
	
	// add columns
	for(var colIndex = 0; colIndex < this.columns.length; colIndex += 1) {
		var column = this.columns[colIndex];
		column.currentIndex = colIndex;
		columnMap[column.id] = colIndex;
		var columnHeader = $(document.createElement("div"))
			.addClass("schedule_topheadercell")
			.css({ left: px(colIndex * this.columnWidth), width: px(this.columnWidth)});
		if(!column.link) {
			columnHeader.text(column.label);
		} else {
			var columnAnchor = $(document.createElement("a"))
				.attr("href", column.link)
				.text(column.label)
				.appendTo(columnHeader);
		}
		column.element = columnHeader;
		this.topElement.append(columnHeader);
		
		var colBlocks = [];
		var rowData = Array();
		for(var i = 0, len = this.rowLabels.length; i < len; i += 1) {
			rowData[i] = null;
		}
		for (var blockIndex in this.blocks) {
			var block = this.blocks[blockIndex];
			if(block.columnId == column.id)
				colBlocks.push(block);
			else
				return;
			
			block.subColumnId = -1;
			
			for(var i = block.row, j = block.row + block.height; i < j; i += 1) {
				if(rowData[i] == null)
					rowData[i] = [block];
				else
					rowData[i].push(block);
			}
		}
		
		var maxCrowding = 0;
		
		for(var i = 0; i < this.rowLabels.length; i += 1) {
			if(rowData[i] == null) continue;
			for (var rowBlockIndex in rowData[i]) {
				var rowBlock = rowData[i][rowBlockIndex];
				if(rowBlock.subColumnId == -1) {
					var proposedSubColumn = 0;
					while(true) {
						var success = true;
						for(var j = 0; j < rowData[i].length; j += 1) {
							if(rowData[i][j].subColumnId == proposedSubColumn) {
								success = false;
								break;
							}
						}
						if(success)
							break;
						proposedSubColumn += 1;
					}
					rowBlock.subColumnId = proposedSubColumn;
					if(proposedSubColumn > maxCrowding) maxCrowding = proposedSubColumn;
				}
			}
		}
		
		adjStep = this.adjacentStep;
		for (var blockIndex in colBlocks) {
			var block = colBlocks[blockIndex];
			block.leftOffset = block.subColumnId * adjStep;
			block.rightOffset = (maxCrowding - block.subColumnId) * adjStep;
		}
	}
	
	// add blocks
	for(var blockIndex = 0, len = this.blocks.length; blockIndex < len; blockIndex += 1) {
		var block = this.blocks[blockIndex];
		
		if(!block.visible)
			continue;
		
		if(columnMap[block.columnId] === undefined)
			continue;
		
		var blockElement = $(document.createElement("div"))
			.addClass("schedule_gridcell")
			.css({
				left: px(this.columnWidth * columnMap[block.columnId] + block.leftOffset),
				top: px(this.rowHeight * block.row),
				width: px(this.columnWidth - this.cellMargin - block.leftOffset - block.rightOffset),
				height: px(block.height * this.rowHeight - this.cellMargin) });
		if(block.height > 1) {
			$(document.createElement("div"))
				.addClass("label")
				.text(block.label)
				.appendTo(blockElement);
			$(document.createElement("div"))
				.addClass("main")
				.text(block.main)
				.appendTo(blockElement);
		} else {
			$(document.createElement("div"))
				.addClass("label")
				.text(block.main)
				.appendTo(blockElement);
			$(document.createElement("div"))
				.addClass("main")
				.appendTo(blockElement);
		}
		if(block.link) {
			blockElement.click(blockClick);
		}
		if(!block.enabled)
			block.addClass("disabled");
		
		blockElement.hover(blockEnter, blockExit);
		
		block.element = blockElement;
		this.gridElement.append(blockElement);
	}
	
	// final additions
	this.element.append(this.leftElement);
	this.element.append(this.topElement);
	this.element.append(this.gridElement);
}

function blockClick(evt) {
	location.href = this.link;
}

function blockEnter(evt) {
	this.addClassName("hover");
}

function blockExit(evt) {
	this.removeClassName("hover");
}

/** @constructor */
Block = function(label, main, row, columnId, height, link) { 
	this.label = label;
	this.main = main;
	this.row = row;
	this.columnId = columnId;
	this.height = height;
	this.element = null;
	this.link = link;
	this.enabled = true;
	this.visible = true;
	this.leftOffset = 0;
	this.rightOffset = 0;
	this.subColumnId = 0;
};

/** @constructor */
Column = function(id, label, link) {
	this.id = id;
	this.label = label;
	this.link = link;
	this.element = null;
	this.visible = true;
	this.currentIndex = -1;
}

})(jQuery);
