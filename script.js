var memory, base, cellWidth, editCell, editType,
	registers, IR, PC, execs, running;

function init() {
	memory = new Uint8Array(256);
	registers = new Uint8Array(16);
	IR = "0000";
	PC = 0;
	editCell=-1;
	editType = "none";
	execs = "";
	running = false;
	document.getElementById("cellEdit").innerHTML = "";
	document.getElementById("output").innerHTML = "";
	switchBase("hex");
}
function load(base, code) {
	init();
	var inc = 0;
	switch(base) {
		case "hex":
			inc = 2;
			break;
		case "dec":
			inc = 3;
			break;
		case "bin":
			inc = 8;
			break;
	}
	for (var i = 0; i < code.length-code.length%inc; i++)
		memory[i/inc]=toInt(code.substring(i,i+inc),base);
	switchBase(base);
}
function switchEditor(type){
	if (type=="machine"){
		document.getElementById("assembler").className = "invisible";
		document.getElementById("aappendix").className = "invisible";
		document.getElementById("happendix").className = "";
		document.getElementById("machine").className = "";
	}
	if (type=="assembler"){
		document.getElementById("assembler").className = "";
		document.getElementById("aappendix").className = "";
		document.getElementById("happendix").className = "invisible";
		document.getElementById("machine").className = "invisible";
	}
}
function exprt() {
	cancelEdit();
	var exprt = "";
	for (var i = 0; i < memory.length; i+=2)
		if (memory[i]+memory[i+1]!=0)
			exprt+=toBase(memory[i],base)+""+toBase(memory[i+1],base);
	if (exprt.length>0)	
		document.getElementById("cellEdit").innerHTML = "Program Export: "+base+":"+exprt;
	else document.getElementById("cellEdit").innerHTML = "Nothing to Export.";
}
function rstart() {
	cclear("pc");
	cclear("regs");
	cclear("out");
}
function run() {
	running = true;
	while (PC < memory.length && running)
		step();
}
function stepfunc() {
	step();
}
function step() {
	cancelEdit();

	IR = toBase(memory[PC],base)+toBase(memory[PC+1],base);

	if (PC == memory.length-2){
		if (toInt(IR,base)!=0){
			parseCommand(IR);

			execs+=IR+"<br>";
			document.getElementById("output").innerHTML = execs;
		}
		refresh();

		running = false;
		return;
	}
	if (PC > memory.length-2){
		running = false;
		return;
	}
	if (toInt(IR,base)==0 && PC < memory.length-2){
		PC+=2;
		step();
		return;
	}
	var res = parseCommand(IR);
	execs+=res;

	if (PC < memory.length-2)
		PC+=2;
	
	document.getElementById("output").innerHTML = execs;

	refresh();
}
function parseCommand(command) {
	var ir1, ir2, opcode, operand, a, b, c, result = "";
	
	ir1 = toBase(toInt(command.substring(0,command.length/2),base),"hex");
	ir2 = toBase(toInt(command.substring(command.length/2),base),"hex");
	
	opcode = ir1.substring(0,1);
	a = ir1.substring(1,2);
	b = ir2.substring(0,1);
	c = ir2.substring(1,2);

	switch (opcode) {
		case "1":
			registers[toInt(a,"hex")] = memory[toInt(b+""+c,"hex")];
			result = "LOAD Register "+a+" with the value in Memory Cell "+b+""+c+".";
			break;
		case "2":
			registers[toInt(a,"hex")] = toInt(b+""+c,"hex");
			result = "LOAD Register "+a+" with the value "+b+""+c+".";
			break;
		case "3":
			memory[toInt(b+""+c,"hex")] = registers[toInt(a,"hex")];
			result = "STORE the value in Register "+a+" into Memory Cell "+b+""+c+".";
			break;
		case "4":
			registers[toInt(c,"hex")] = registers[toInt(b,"hex")];
			result = "MOVE the value in Register "+b+" into Register "+c+".";
			break;
		case "5":
			var x,y;
			x = toBase(registers[toInt(b,"hex")],"bin");
			y = toBase(registers[toInt(c,"hex")],"bin");

			if (x.charAt(0) == "1")
				x = toInt(x,"bin") - 256;
			else x = toInt(x,"bin");
			if (y.charAt(0) == "1")
				y = toInt(y,"bin") - 256;
			else y = toInt(y,"bin");

			registers[toInt(a,"hex")] = x + y;

			result = "ADD the values in Registers "+b+" and "+c+" and place the result in Register "+a+".";
			break;
		case "6":
			//add bit patterns as if the were floating point notation
			break;
		case "7":
			registers[toInt(a,"hex")] = toInt(b,"hex") | toInt(c,"hex");
			result = "OR the values in Registers "+b+" and "+c+" and place the result in Register "+a+".";
			break;
		case "8":
			registers[toInt(a,"hex")] = toInt(b,"hex") & toInt(c,"hex");
			result = "AND the values in Registers "+b+" and "+c+" and place the result in Register "+a+".";
			break;
		case "9":
			registers[toInt(a,"hex")] = toInt(b,"hex") ^ toInt(c,"hex");
			result = "EXCLUSIVE OR the values in Registers "+b+" and "+c+" and place the result in Register "+a+".";
			break;
		case "A":
			var temp = toBase(registers[toInt(a,"hex")],"bin");
			for (var i = 0; i < toInt(c,"hex"); i++)
				temp = temp.charAt(temp.length-1)+temp.substring(0,temp.length-1);
			registers[toInt(a,"hex")] = toInt(temp,"bin");
			result = "ROTATE the bits in Register "+a+" "+c+" times to the right.";
			break;
		case "B":
			if (registers[toInt(a,"hex")] == registers[0])
				PC = toInt(b+""+c,"hex")-2;
			result = "JUMP to Memory Cell "+b+""+c+" if the value in Register "+a+" is equal to the value in Register 0.";
			break;
		case "C":
			if ((a+""+b+""+c) == "000")
				running = false;
			result = "HALT the program.";
			break;
		case "F":			//special commands
			switch(a){
				case "0":
					if (b+c!=0)	break;
					cclear("regs");
					cclear("out");
					PC = 0;
					break;
				case "1":
					for (var i = toInt(b,"hex"); i < toInt(c,"hex"); i++)
						registers[i] = 0;
					cclear("out");
					break;
				case "2":
					for (var i = toInt(b+""+c,"hex"); i < memory.length; i++)
						memory[i] = 0;
					break;
				/*
				case "3":
					for (var i = PC; i < toInt(b+""+c,"hex") && i < memory.length; i++)
						memory[i] = 0;
					break;
				*/
			}
			break;
	}
	return command+" "+result+"<br>";
}
function validateLen(value, base) {
	var len = 0;
	switch(base) {
		case "hex":
			len = 2;
			break;
		case "dec":
			len = 3;
			break;
		case "bin":
			len = 8;
			break;
	}
	while((""+value).length < len)
		value = "0"+value;
	return value;
}
function refresh(){
	IR = toBase(memory[PC],base)+toBase(memory[PC+1],base);

	document.getElementById("pc").innerHTML = formatPC();
	document.getElementById("ir").innerHTML = "Instruction Register: "+IR;

	var regs = "", table = "";

	for (var i = 0; i < registers.length; i++)
		regs+=formatReg(i);
	document.getElementById("regs").innerHTML = regs;

	for (var i = 0; i < memory.length; i++)
		table+=formatCell(i);
	document.getElementById("table").innerHTML = table;
}
function cclear(target) {
	switch(target) {
		case "pc":
			PC = 0;
			break;
		case "regs":
			registers = new Uint8Array(16);
			break;
		case "mem":
			memory = new Uint8Array(256);
			PC = 0;
			break;
		case "out":
			execs = "";
			document.getElementById("output").innerHTML = execs;
			break;
	}
	refresh();
}
function formatPC() {
	var val = toBase(PC,base);

	w = 7 + cellWidth;
	var result = "<div id=\"subpc\" style=\"width:"+w+"em;";
	if (editType=="pc")
		result+="background-color:lightgrey;";
	result+="\" onclick=\"edit('pc',0)\">Program Counter: "+val+"</div>";
	return result;
}
function formatReg(index) {
	var val = toBase(registers[index],base);

	var result = "<div id=\"r"+index+"\" style=\"width:"+cellWidth*2+"em;height:1.5em;display:inline-block;text-align:center;";
	if (editType=="reg"&&editCell==index)
		result+="background-color:lightgrey;";
	result+="\" onclick=\"edit('reg',"+index+")\">R"+toBase(index,base)+": "+val+"</div>";
	return result;
}
function formatCell(index) {
	var val = toBase(memory[index],base);

	var result = "<div id=\"i"+index+"\" style=\"width:"+cellWidth+"em;height:1.5em;display:inline-block;text-align:center;";
	if ((memory[index]==192&&index<memory.length-1&&memory[index+1]==0)
		||(memory[index]==0&&index>0&&memory[index-1]==192))
		result+="background-color:red;";
	if (PC==index||PC==index-1)
		result+="background-color:lightblue;";
	if (editType=="cell"&&editCell==index)
		result+="background-color:lightgrey;";
	result+="\" onclick=\"edit('cell',"+index+")\">"+val+"</div>";
	return result;
}
function toInt(val, base){
	switch(base){
		case "hex":
			return parseInt(val,16);
		case "dec":
			return parseInt(val);
		case "bin":
			return parseInt(val,2);
	}
}
function edit(type, cell) {
	editCell = cell;
	editType = type;
	refresh();
	var label = "", id = "";
	switch(type){
		case "pc":
			label = "PC:";
			id = "subpc";
			break;
		case "reg":
			label = "R"+toBase(cell,base)+":";
			id = "r"+cell;
			break;
		case "cell":
			label = ""+toBase(cell,base)+":";
			id = "i"+cell;
			break;
		case "load":
			label = "Code:";
			break;
	}
	document.getElementById("cellEdit").innerHTML = label+
	"<input type=\"text\" id=\"editting\" onkeydown = \""
		+"if (event.keyCode == 13) confirmEdit();"
		+"if (event.keyCode == 27) cancelEdit();"
		//+"if (event.keyCode == 8) prevCell();"
		//+"if (event.keyCode == 9) nextCell();"
		+"\"><input type=\"button\" value=\"Confirm\""
		+" onclick=\"confirmEdit();\"><input type=\"button\""
		+" value=\"Cancel\" onclick=\"cancelEdit();\">";
	document.getElementById("editting").focus();
}
function confirmEdit() {
	var val = document.getElementById("editting").value;
	if (val == ""){
		cancelEdit();
		return;
	}
	switch(editType){
		case "pc":
			PC = toInt(val, base);
			if (PC%2==1)	PC--;
			cancelEdit();
			return;
		case "reg":
			registers[editCell] = toInt(val, base);
			break;
		case "cell":
			memory[editCell] = toInt(val, base);
			break;
		case "load":
			load(
				val.substring(0,val.indexOf(":")),
				val.substring(val.indexOf(":")+1));
			cancelEdit();
			return;
	}
	editCell++;
	if ((editCell > memory.length-1&&editType=="cell")
		||(editCell > registers.length-1&&editType=="reg")){
		cancelEdit();
		return;
	}
	edit(editType, editCell);
}
function cancelEdit() {
	editCell = -1;
	editType = "none";
	document.getElementById("cellEdit").innerHTML = "<br>";
	refresh();
}
function prevCell() {
	if (document.getElementById("editting").value != "" || editCell == 0)
		return;
	cancelEdit();
	editCell--;
	edit(editType, editCell);
}
function nextCell() {
	if (editCell >= memory.length - 1)
		return;
	cancelEdit();
	editCell++;
	edit(editType, editCell);
}
function toBase(value, base) {
	switch(base){
		case "hex":
			return validateLen(value.toString(16).toUpperCase(),"hex");
		case "dec":
			return validateLen(value.toString(10).toUpperCase(),base);
		case "bin":
			return validateLen(value.toString(2).toUpperCase(),base);
	}
	
}
function switchBase(b) {
	base = b;
	switch(b){
		case "hex":
			cellWidth = 3;
			break;
		case "dec":
			cellWidth = 3;
			break;
		case "bin":
			cellWidth = 6;
			break;
	}
	refresh();
}
function random() {
	for (var i = 0; i < memory.length; i++){
		memory[i] = Math.floor(Math.random()*memory.length);
	}
	refresh();
}
