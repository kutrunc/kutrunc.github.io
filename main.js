const SUBMIT_BUTTON_VALUE = "Buscar";

const STATE = {
	databaseLines: null,

	cpfInputElement: null,
	submitInputElement: null,
	resultsBodyElement: null,
	resultsInvoiceTotalElement: null,
	resultsPaidTotalElement: null,
	resultTemplate: null,
};

downloadDatabase();
window.onload = function() {
	STATE.cpfInputElement = document.getElementById("cpf-input");
	STATE.submitInputElement = document.getElementById("submit-input");
	STATE.resultsBodyElement = document.querySelector(".results tbody");
	STATE.resultsInvoiceTotalElement = document.querySelector(".results tfoot .invoice");
	STATE.resultsPaidTotalElement = document.querySelector(".results tfoot .paid");
	STATE.resultTemplate = document.getElementById("result-template");

	if (STATE.databaseLines == null) {
		STATE.submitInputElement.value = "Atualizando Banco de Dados...";
		STATE.submitInputElement.disabled = true;
	} else {
		STATE.submitInputElement.value = SUBMIT_BUTTON_VALUE;
		STATE.submitInputElement.disabled = true;
	}
};

function onFormSubmit() {
	if (STATE.databaseLines == null) {
		return;
	}

	const query = STATE.cpfInputElement.value;

	while (STATE.resultsBodyElement.lastChild != null) {
		STATE.resultsBodyElement.removeChild(STATE.resultsBodyElement.lastChild);
	}

	let invoiceTotal = 0.0;
	let paidTotal = 0.0;

	for (const entry of STATE.databaseLines) {
		if (entry.cpf != query) {
			continue;
		}

		invoiceTotal += entry.invoice;
		paidTotal += entry.paid;

		const entryElement = createElementFromEntry(entry);
		STATE.resultsBodyElement.appendChild(entryElement);
	}

	STATE.resultsInvoiceTotalElement.textContent = invoiceTotal;
	STATE.resultsPaidTotalElement.textContent = paidTotal;

	return false;
}

function formatCurrency(n) {
	return n.toLocaleString(undefined, {minimumFractionDigits: 2});
}

function createElementFromEntry(entry) {
	const element = STATE.resultTemplate.content.cloneNode(true);

	const timestampElement = element.querySelector(".timestamp");
	timestampElement.textContent = entry.timestamp;

	const invoiceElement = element.querySelector(".invoice");
	invoiceElement.textContent = formatCurrency(entry.invoice);

	const paidElement = element.querySelector(".paid");
	paidElement.textContent = formatCurrency(entry.paid);

	return element;
}

function downloadDatabase() {
	const request = new XMLHttpRequest();
	request.open("GET", "db.csv", true);
	request.overrideMimeType("text/csv");
	request.onreadystatechange = function() {
		if (request.readyState === request.DONE) {
			if (request.status === 200) {
				STATE.databaseLines = parseDatabase(request.responseText);
				console.log("entry count: ", STATE.databaseLines.length);
			} else {
				STATE.databaseLines = [];
			}

			STATE.submitInputElement.disabled = false;
			STATE.submitInputElement.value = SUBMIT_BUTTON_VALUE;
		}
	};
	request.send();
}

function parseCurrency(text) {
	return parseFloat(text.replace(",", "."));
}

function parseDatabase(text) {
	const lines = text.split(/\r\n|\n\r|\n|\r/);
	lines.shift();

	const entries = [];

	const COLUMN_COUNT = 4;
	for (const line of lines) {
		if (line.length == 0) {
			continue;
		}
	
		const parts = line.split(";", COLUMN_COUNT);
		if (parts.length < COLUMN_COUNT) {
			console.error("menos de", COLUMN_COUNT, "colunas:\n", line);
			continue;
		}

		let timestamp = parts[1].trim();
		timestamp = timestamp.substring(4) + "/" + timestamp.substring(0, 4);

		const invoice = parseCurrency(parts[2]);
		if (invoice == NaN) {
			console.error("nao deu pra extrair numero a partir do 'faturado':\n", line);
			continue;
		}

		const paid = parseCurrency(parts[3]);
		if (paid == NaN) {
			console.error("nao deu pra extrair numero a partir do 'pago':\n", line);
			continue;
		}

		entries.push({
			cpf: parts[0],
			timestamp: timestamp,
			invoice: invoice,
			paid: paid,
		});
	}

	return entries;
}
