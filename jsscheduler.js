function px(value) {
	return String(Math.round(value)) + "px";
}

Schedule = function(element) {
	this.element = $(element);
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
	$A(this.element.descendants()).each(function(x) {
		x.parentElement.removeChild(x);
	});
	this.element.setStyle({ width: px(this.leftWidth + this.columns.length * this.columnWidth),
	                        height: px(this.topHeight + this.rowLabels.length * this.rowHeight)});
	
	// create header elements
	this.leftElement = new Element("div", {"class": "schedule_headerleft"})
		.setStyle({ "top": px(this.topHeight), "width": px(this.leftWidth) });
	this.topElement = new Element("div", {"class": "schedule_headertop"})
		.setStyle({ "height": px(this.topHeight), "left": px(this.leftWidth) });
	this.topAxisLabelElement = new Element("div", {"class": "schedule_topaxislabel"})
		.update(this.topAxisTitle);
	this.gridElement = new Element("div", {"class": "schedule_grid"})
		.setStyle({ "left": px(this.leftWidth), "top": px(this.topHeight) });
	
	this.topElement.appendChild(this.topAxisLabelElement);
	
	// add row headers
	for(var rowIndex = 0, len = this.rowLabels.length; rowIndex < len; rowIndex += 1) {
		var rowHeader = new Element("div", {"class": "schedule_leftheadercell"})
			.setStyle({ "top": px(rowIndex * this.rowHeight), "height": px(this.rowHeight) })
			.update((rowIndex < this.rowLabels.length) ? this.rowLabels[rowIndex] : '');
		this.leftElement.appendChild(rowHeader);
	}
	
	var columnMap = {};
	
	// add columns
	for(var colIndex = 0; colIndex < this.columns.length; colIndex += 1) {
		var column = this.columns[colIndex];
		column.currentIndex = colIndex;
		columnMap[column.id] = colIndex;
		var columnHeader = new Element("div", {"class": "schedule_topheadercell"})
			.setStyle({ "left": px(colIndex * this.columnWidth), "width": px(this.columnWidth)});
		if(!column.link) {
			columnHeader.update(column.label);
		} else {
			var columnAnchor = new Element("a", {"href": column.link})
				.update(column.label);
			columnHeader.appendChild(columnAnchor);
		}
		column.element = columnHeader;
		this.topElement.appendChild(columnHeader);
		
		var colBlocks = [];
		var rowData = Array();
		for(var i = 0, len = this.rowLabels.length; i < len; i += 1) {
			rowData[i] = null;
		}
		this.blocks.each(function(block) {
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
		});
		
		var maxCrowding = 0;
		
		for(var i = 0; i < this.rowLabels.length; i += 1) {
			if(rowData[i] == null) continue;
			rowData[i].each(function(rowBlock) {
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
			});
		}
		
		adjStep = this.adjacentStep;
		colBlocks.each(function(block) {
			block.leftOffset = block.subColumnId * adjStep;
			block.rightOffset = (maxCrowding - block.subColumnId) * adjStep;
		});
	}
	
	// add blocks
	for(var blockIndex = 0, len = this.blocks.length; blockIndex < len; blockIndex += 1) {
		var block = this.blocks[blockIndex];
		
		if(!block.visible)
			continue;
		
		if(columnMap[block.columnId] === undefined)
			continue;
		
		var blockElement = new Element("div", {"class": "schedule_gridcell"})
			.setStyle({ "left": px(this.columnWidth * columnMap[block.columnId] + block.leftOffset), "top": px(this.rowHeight * block.row),
			            "width": px(this.columnWidth - this.cellMargin - block.leftOffset - block.rightOffset), "height": px(block.height * this.rowHeight - this.cellMargin) });
		if(block.height > 1) {
			blockElement.appendChild(new Element("div", {"class": "label"}).update(block.label));
			blockElement.appendChild(new Element("div", {"class": "main"}).update(block.main));
		} else {
			blockElement.appendChild(new Element("div", {"class": "label"}).update(block.main));
			blockElement.appendChild(new Element("div", {"class": "main"}));
		}
		if(block.link) {
			Event.observe(blockElement, "click", blockClick.bindAsEventListener(block));
		}
		if(!block.enabled)
			block.addClassName("disabled");
		
		Event.observe(blockElement, "mouseenter", blockEnter.bindAsEventListener(blockElement));
		Event.observe(blockElement, "mouseleave", blockExit.bindAsEventListener(blockElement));
		
		block.element = blockElement;
		this.gridElement.appendChild(blockElement);
	}
	
	// final additions
	this.element.appendChild(this.leftElement);
	this.element.appendChild(this.topElement);
	this.element.appendChild(this.gridElement);
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

Column = function(id, label, link) {
	this.id = id;
	this.label = label;
	this.link = link;
	this.element = null;
	this.visible = true;
	this.currentIndex = -1;
}