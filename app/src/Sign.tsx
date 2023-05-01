// @ts-nocheck
import React, { useState, ChangeEvent, useEffect } from "react";
import { MAX_JSON_SIZE, toAsciiArray } from "./utilities/jsonUtils";
import "./App.css";
import { PageStyle } from "./App";
import { Button, ColumnContainer, fonts, PageTitle, RestrictWidthContainer, RowContainer, Text } from "./common";
import { hashAndSignEddsaMiMC } from "./utilities/cryptoUtils";
import { empty1040src, pdfToJSON } from "./utilities/f1040";
import { useColor } from "./ColorContext";

const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");

const signPageStyle: PageStyle = {
	backgroundColor: "#00599c",
	textColor: "#f8f8f8",
	altBackgroundColor: "#eaeaea",
	buttonColor: "#add8e6",
};

const Sign = () => {
	// const [inputJson, setInputJson] = useState<string>(`{"SSN": "000-00-0000", "fname": "DONALD J", "lname": "TRUMP", "address_state": "FL", "f_1": "393,229", "f_2a": "2,208", "f_2b": "10,626,179", "f_3a": "17,694","f_3b": "25,347","f_4a": "","f_4b": "","f_5a": "","f_5b": "86,532","f_6a": "","f_6b": "", "f_7": "", "f_8": "-15,825,345", "f_9": "-4,694,058", "f_10a": "101,699","f_10b": "","f_10c": "101,699","f_11": "-4,795,757","f_12": "915,171","f_13": "", "f_14": "915,171","f_15": "0","f_16": "0","f_17": "","f_18": "0","f_19": "","f_20": "","f_21": "","f_22": "0","f_23": "271,973","f_24": "271,973","f_25a": "83,915","f_25b": "","f_25c": "1,733","f_25d": "85,649","f_26": "13,635,520","f_27": "","f_28": "","f_29": "","f_30": "","f_31": "19,397","f_32": "19,397","f_33": "13,740,566","f_34": "13,468,593","f_35a": "","f_35b": "000000000","f_35c": "checking","f_35d": "00000000000000000","f_36": "8,000,000","f_37": "","year": "2020","form": "1040"}`);
	// const [inputJson, setInputJson] = useState<string>(`{"beans":"great"}`);
	const [inputJson, setInputJson] = useState<string>("");
	const [signedTaxData, setSignedTaxData] = useState("");

	const { pageStyle, setPageStyle } = useColor();

	useEffect(() => {
		setPageStyle(signPageStyle);
	});

	async function on1040PDF(e: ChangeEvent<HTMLInputElement>) {
		/*
        Handles the PDF File input. Expects form 1040 from 2020.
        */
		const fileInput = e.target;
		if (!fileInput.files || fileInput.files.length === 0) {
			console.error("No files?!");
			return;
		}
		const file = fileInput.files[0];
		const fBytes = await file.arrayBuffer();
		const json1040 = await pdfToJSON(fBytes);
		console.log(json1040);
		setInputJson(JSON.stringify(json1040));
	}

	const filterJsonKeysByValue = (jsonObj: Map<string, string>) => {
		// Filter the JSON object to only include keys with a non-empty value
		return Object.keys(jsonObj).reduce((p, c) => {
			if (jsonObj[c].length > 0) p[c] = jsonObj[c];
			return p;
		}, {});
	};

	const handleSign = async () => {
		let parsedJsonObj = JSON.parse(inputJson);
		parsedJsonObj = filterJsonKeysByValue(parsedJsonObj);
		console.log("filtered JSON");
		console.log(filterJsonKeysByValue(parsedJsonObj));
		const parsedJson = JSON.stringify(parsedJsonObj);
		if (parsedJson.length > MAX_JSON_SIZE) {
			console.error(
				"Cannot handle json: too large. Max size:",
				MAX_JSON_SIZE,
				"Json array size:",
				parsedJson.length,
			);
			return false;
		}

		const asciiArray = toAsciiArray(parsedJson);
		const paddingLength = MAX_JSON_SIZE - asciiArray.length;
		const paddedInput = asciiArray.concat(Array(paddingLength).fill(32));
		const signature = await hashAndSignEddsaMiMC(paddedInput);

		const inputs = {
			json: paddedInput,
			pubkey: signature.pubkey,
			signature_R8x: signature.R8x,
			signature_R8y: signature.R8y,
			signature_S: signature.S,
		};
		console.log("Inputs", JSON.stringify(inputs));
		setSignedTaxData(JSON.stringify(inputs));
	};

	const handleDownload = () => {
		const element = document.createElement("a");
		const file = new Blob([signedTaxData], { type: "application/json" });
		element.href = URL.createObjectURL(file);
		element.download = "signedTaxData.txt";
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	};

	const handleCopyToClipboard = () => {
		navigator.clipboard.writeText(signedTaxData);
		alert("JSON copied to clipboard");
	};

	return (
		<ColumnContainer style={{ paddingBottom: 50, backgroundColor: pageStyle.backgroundColor }}>
			<PageTitle title="Sign" subtitle="Get your tax info sign by authority" />
			<RestrictWidthContainer>
				{signedTaxData.length === 0 ? (
					<ColumnContainer>
						<Text size={fonts.fontM} style={{ fontWeight: "700", marginBottom: 10, marginTop: 20 }}>
							My 1040
						</Text>
						{/* <Text size={fonts.fontM}>Example empty 2020 Form 1040 from the IRS</Text>
				<a target="_blank" href="https://www.irs.gov/pub/irs-prior/f1040--2020.pdf">
					https://www.irs.gov/pub/irs-prior/f1040--2020.pdf
				</a> */}
						<iframe src={empty1040src} id="pdf" style={{ width: "auto", height: 400 }} scrolling="yes" />
						<Text size={fonts.fontM} style={{ fontWeight: "700", marginBottom: 5, marginTop: 20 }}>
							Upload Tax Data
						</Text>
						<input
							id="dropzone-file"
							name="f1040"
							type="file"
							onChange={on1040PDF}
							style={{ backgroundColor: pageStyle.altBackgroundColor }}
						/>
						<Text size={fonts.fontM} style={{ fontWeight: "700", marginBottom: 5, marginTop: 20 }}>
							OR... Enter Tax Data JSON
						</Text>
						<textarea
							value={inputJson}
							style={{ marginBottom: 10, height: 100 }}
							onChange={(event) => {
								setInputJson(event.target.value);
							}}
							placeholder="Enter JSON here..."
						/>
						<Button title="Get Signed Tax Data" background="#ADD8E6" onClick={handleSign} />
					</ColumnContainer>
				) : (
					<ColumnContainer style={{ marginTop: 20, marginBottom: 20 }}>
						<Text size={fonts.fontM} style={{ fontWeight: "700", marginBottom: 5, marginTop: 20 }}>
							My Signed Tax Data
						</Text>
						<ColumnContainer
							style={{ padding: 10, backgroundColor: pageStyle.altBackgroundColor, borderRadius: 5 }}>
							<Text size={fonts.fontXXS} style={{ overflowWrap: "anywhere", color: "#161616" }}>
								{signedTaxData}
							</Text>
						</ColumnContainer>

						<RowContainer style={{ marginTop: 10 }}>
							<Button
								title="Download Signed Tax Data"
								onClick={handleDownload}
								style={{ flex: 1, marginRight: 5 }}
							/>
							<Button
								title="Copy to Clipboard"
								onClick={handleCopyToClipboard}
								style={{ flex: 1, marginLeft: 5 }}
							/>
						</RowContainer>
					</ColumnContainer>
				)}
			</RestrictWidthContainer>
		</ColumnContainer>
	);
};

export default Sign;
