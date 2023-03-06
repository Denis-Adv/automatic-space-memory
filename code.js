let areaCoords = [
	{ top: 45.6854, right: 7.0157, bottom: 45.4416, left: 6.7377 },
	{ top: 45.728, right: 7.104, bottom: 45.397, left: 6.724 }
];
var canvas = document.getElementById("map");
canvas.addEventListener('click', showDetails);
var g = canvas.getContext("2d");
const area1image = new Image();
area1image.src = 'https://github.com/Denis-Adv/automatic-space-memory/blob/codespace-denis-adv-automatic-space-memory-9rwx4g99w99hxpxx/carte1.jpg?raw=true';
const area2image = new Image();
area2image.src = 'https://github.com/Denis-Adv/automatic-space-memory/blob/codespace-denis-adv-automatic-space-memory-9rwx4g99w99hxpxx/carte2.jpg?raw=true';
let areaimages = [ area1image, area2image ];
let currentAreaIdx = 0;
let currentParamName = 'temperature';
let hotRects;
let reports = JSON.parse('[ {"station": {"name": "BOURG ST MAURICE","uuid": "babe0746-591f-4514-913c-e0943d45f62f","latitude": 45.6127,"longitude": 6.76333,"elevation": 865,"city": "Bourg-Saint-Maurice (73)"},"observation": {"time": "2023-02-16T17:00:00+00:00","temperature": {"value": "8.7","name": "temperature","longname": "Temperature de l air","unit": "°C","resolution": 0.1},"humidity": {"value": "43","name": "humidity","longname": "Humidité relative","unit": "%","resolution": 1}}}]');
let dataTime = new Date().getTime() - 60000;
dataTime -=  dataTime%3600000;
let dataDate = new Date(dataTime);

if (canvas.width > window.innerWidth)
	canvas.width = window.innerWidth - 6;

area1image.addEventListener("load", () => selectArea(0));
downloadReports();

function downloadReports() {
	const error = document.getElementById("error");
	download(dataDate, function () {
		if (this.readyState == 4 && this.status == 200) {
			reports = JSON.parse(this.responseText);
			console.log(reports);
			error.hidden = true;
			selectArea(0);
		}
		else {
			reports = [];
			if (this.status !== 0) {
				error.innerHTML = "Error: " + this.status;
				error.hidden = false;
			}
    }
	});
}

function download(date, callback) {
	let url = "https://api.meteo-concept.com/api/observations/around?datetime="
			+ date.toISOString().replace(":00.000Z", "%2B00%3A00").replace(":", "%3A")
			+ "&latlng=45.6,6.8&radius=30&token=3e8594fdf44b63465e0452d1f4bada50647f8534eed6c10029886d6361d3d153";
	var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = callback;
	xhttp.open("GET", url, true);
  xhttp.setRequestHeader('Access-Control-Allow-Headers', '*');
	xhttp.send();
}

function selectArea(areaIdx) {
	const areaNames = [ "area1", "area2" ];
	document.getElementById(areaNames[currentAreaIdx]).className = "areaBtn";
	document.getElementById(areaNames[areaIdx]).className = "areaBtnSelected";
	currentAreaIdx = areaIdx;
	let image = areaimages[areaIdx];
	canvas.height = canvas.width * image.height / image.width;
	selectParam(currentParamName);
}

function selectParam(paramName) {
	document.getElementById(currentParamName).className = "paramBtn";
	document.getElementById(paramName).className = "paramBtnSelected";
	currentParamName = paramName;
	plotReports(paramName);
}

function plotReports(paramName) {
  g.drawImage(areaimages[currentAreaIdx], 0, 0, canvas.width, canvas.height);
	
	hotRects = [];
  for (report of reports) {
    let { x, y } = getxy(report);
    g.translate(x, y);
    let plotRect = plotReport(report, paramName);
		if (plotRect) {
			plotRect.left += x;
			plotRect.right += x;
			plotRect.top += y;
			plotRect.bottom += y;
			hotRects.push({ ...plotRect, station: report.station });
		}
    g.translate(-x, -y);
  }

	// Draw the time
	let hour = dataDate.getHours();
  let minute = dataDate.getMinutes();
	let hhmm = (hour>9 ? '' : '0') + hour + ':' + (minute>9 ? '' : '0') + minute;
  g.fillStyle = "white";
	g.fillRect(0, 0, 42, 16);
	g.font = "14px arial";
  g.fillStyle = "black";
  g.fillText(hhmm, 3, 13);
}

function getxy(report) {
	let coords = areaCoords[currentAreaIdx];
  return {
      x: (report.station.longitude - coords.left) / ( coords.right -  coords.left) * canvas.width,
      y: ( coords.top - report.station.latitude) / ( coords.top -  coords.bottom) * canvas.height
  };
}

function plotReport(report, paramName) {
	let param = report.observation[paramName];
	if (!param)
		return undefined;
	let paramValue = param.value;
	if (!paramValue)
		return undefined;
	let { textColor, bgColor, decimal } = paramSyle(paramName, paramValue);
	let unit;
	if (paramName === "icing") {
		unit = "";
		switch(paramValue) {
			case 0: paramValue = "Aucun"; break;
			case 1: paramValue = "Faible"; break;
			case 2: paramValue = "Elevé"; break;
		}
	}
	else
		unit = param.unit;
	let n = Math.floor(paramValue);
	if (!decimal)
		paramValue = n;

	const font = "14px arial";
	const smallFont = "11px arial";
	const spacing = 2;
	const textWidth = getTextWidth("" + paramValue, font) + spacing + getTextWidth(unit, smallFont) - 1;
	const rectWidth = 52;
	const rectHeight = 17;
	const rectTop = -20;
  g.fillStyle = bgColor;
  g.beginPath();
	if (g.roundRect) {
		g.roundRect(-rectWidth/2, rectTop, rectWidth, rectHeight, 5);
		g.fill();
	}
	else	// missing on safari
		g.fillRect(-rectWidth/2, rectTop, rectWidth, rectHeight);
  g.fillStyle = textColor;
  g.font = font;
	let textX = -rectWidth/2 + (rectWidth - textWidth)/2;
	let textY = -7;
	// Draw the main digits with big font, the decimal with small font
  g.fillText(n, textX, textY);
	textX += getTextWidth(n, font);
	g.font = smallFont;
	if (decimal) {
		// Draw the decimal
		g.fillText("." + Math.round((paramValue-n)*10), textX, textY);
		textX += getTextWidth(".9", smallFont);
	}
	// Draw the unit
	textX += spacing;
	g.fillText(param.unit, textX, textY);
	// Draw the station name
  g.fillStyle = "#556";
	textY = report.station.uuid==="babe0746-591f-4514-913c-e0943d45f62f" ? rectTop-4 : 10;
	for (let name of stationShortName(report.station).split("\n")) {
	  g.fillText(name, -getTextWidth(name, smallFont)/2, textY);
		textY += 13;
	}
	return { left: -rectWidth/2, top: rectTop, right: rectWidth/2, bottom: rectTop + rectHeight };
}

function paramSyle(paramName, paramValue) {
	let textColor = "white";
	let bgColor;
	let decimal = false;
	switch (paramName) {
		case "temperature":
			bgColor = temperatureColor(paramValue);
			decimal = true;
			break;
		case "humidity":
			bgColor = "royalblue";
			break;
		case "wind_s":
			bgColor = "salmon";
			break;
		case "icing":
			textColor = "black";
			switch (paramValue) {
				case 0: bgColor = "green";
				case 1: bgColor = "yellow";
				case 2: bgColor = "red";
			}
	}
	return { textColor: textColor, bgColor: bgColor, decimal };
}

function temperatureColor(tempe) {
	const thresholds = [ -15, -10, 0, 10, 15, 25 ];
	const rs = [ 0, 0, 140, 20, 150, 255 ];
	const gs = [ 140, 0, 140, 210, 170, 70 ];
	const bs = [ 170, 230, 255, 40, 0, 70 ];
	let r = 0, g = 0, b = 0;
	for (let i = 0; i < thresholds.length; i++) {
		if (tempe <= thresholds[i]) {
			if (i === 0) {
				r = rs[0];
				g = gs[0];
				b = bs[0];
			}
			else {
				const c = (tempe - thresholds[i - 1]) / (thresholds[i] - thresholds[i - 1]);
				r = rs[i - 1] + c * (rs[i] - rs[i - 1]);
				g = gs[i - 1] + c * (gs[i] - gs[i - 1]);
				b = bs[i - 1] + c * (bs[i] - bs[i - 1]);
			}
			break;
		}
		else if (i === thresholds.length - 1) {
			r = rs[3];
			g = gs[3];
			b = bs[3];
		}
	}
	return "rgb(" + Math.round(r) + "," + Math.round(g) + "," + Math.round(b) + ")";
}

function showDetails(event) {
	let x = event.pageX - (canvas.offsetLeft + canvas.clientLeft);
	let y = event.pageY - (canvas.offsetTop + canvas.clientTop);
	for (const rect of hotRects ) {
		if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
			document.getElementById("modal-1").click();
			// Load the modal
			document.getElementById("station").innerHTML =
							stationShortName(rect.station).replace("\n", " - ");
			if (rect.station.elevation)
				document.getElementById("elevation").innerHTML = rect.station.elevation;
			let historyTable = document.getElementById("history");
			let time = dataTime - dataTime%(3*3600000); // Round to nearest 3 hours
			for (let i = 2; i >= 0; i--) {
				historyTable.rows[1].cells[i].innerHTML = new Date(time).getDate();
				for (let j = (time / (3*3600000)) % 8; j >= 0; j--, time -= (3*3600000)) {
					download(new Date(time), function () {
							if (this.readyState === 4 && this.status === 200) {
								for (report of JSON.parse(this.responseText)) {
									if (report.station.uuid === rect.station.uuid) {
										const observation = report.observation;
										let text = "";
										if (observation.temperature)
											text = observation.temperature.value + "°C  ";
										if (observation.humidity)
											text += observation.humidity.value + "%";
										historyTable.rows[j+2].cells[i+1].innerHTML = text;
									}
								}
							}
						});
				}
			}
			
			let moreInfo = document.getElementById("more");
			if (rect.station.uuid === "babe0746-591f-4514-913c-e0943d45f62f") {
				moreInfo.href = "https://www.infoclimat.fr/observations-meteo/temps-reel/bourg-st-maurice/07497.html";
				moreInfo.hidden = false;
			}
			else
				moreInfo.hidden = true;
		}
	}
}

function stationShortName(station) {
	switch (station.uuid) {
		case "babe0746-591f-4514-913c-e0943d45f62f": return "Bourg";
		case "922d3013-f25a-4984-99af-bea696ae0a38": return "Aiguille Rouge";
		case "90fa62d7-40d5-447c-b7b5-dc5f7a52b6f3": return "Le Fort";
		case "98ed1815-da1a-415b-a559-4c451386a437": return "Rosière";
		case "47604055-03ae-4d09-93eb-d4a8cf7a4316": return "Arcs 1600";
		case "c9da5964-95ed-49fb-8ec4-c21ab18cf3a3": return "Sommet Arpette";
		default: return station.name;
	}
}

function getTextWidth(text, font) {
  // re-use canvas object for better performance
  const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}
