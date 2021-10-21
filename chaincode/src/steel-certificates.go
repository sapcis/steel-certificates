package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/golang/protobuf/proto"
	// "github.com/hyperledger/fabric-chaincode-go/shim"
	// "github.com/hyperledger/fabric-protos-go/msp"
	// "github.com/hyperledger/fabric-protos-go/peer"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/protos/msp"
	"github.com/hyperledger/fabric/protos/peer"
)

type InCertificate struct {
	CertNumber       string `json:"certnumber"`
	CertDate         string `json:"certdate"`
	ManufacturerCode string `json:"manufacturercode"`
	CompanyCode      string `json:"companycode"`
	CertCheckcode    string `json:"certcheckcode"`
	ProductName      string `json:"productname"`
	Status           string `json:"status"`
	CertURL          string `json:"certurl"`
}

type OutCertificate struct {
	CompanyCode string `json:"companycode"`
	ProductName string `json:"productname"`
	Status      string `json:"status"`
	CertURL     string `json:"certurl"`
	CheckSum    string `json:"checkcsum"`
	ID          string `json:"ID"`
}

func (certificate *OutCertificate) FromJson(input []byte) {
	json.Unmarshal(input, certificate)
}

func Success(rc int32, doc string, payload []byte) peer.Response {
	return peer.Response{
		Status:  rc,
		Message: doc,
		Payload: payload,
	}
}

func Error(rc int32, doc string) peer.Response {
	logger.Errorf("Error %d = %s", rc, doc)
	return peer.Response{
		Status:  rc,
		Message: doc,
	}
}

func generateChecksum(in InCertificate) string {
	// generate checksum
	checksum := sha256.Sum256([]byte(in.CertNumber + `|` + in.CertDate + `|` + in.ManufacturerCode + `|` + in.CompanyCode + `|` + in.CertCheckcode))
	return hex.EncodeToString(checksum[:])
}

func generateID(in InCertificate) string {
	// generate ID
	ID := sha256.Sum256([]byte(in.CertNumber + `|` + in.CertDate + `|` + in.ManufacturerCode + `|` + in.CompanyCode + `|` + in.CertCheckcode + `|` + in.Status))
	return hex.EncodeToString(ID[:])
}

func checkCertPublicAttr(certAttr ...string) error {
	// status check
	matched, err := regexp.Match(`^\d{3}$`, []byte(certAttr[0]))
	if !matched || err != nil {
		return errors.New("Wrong certificate status format")
	}
	if len(certAttr) > 1 {
		// certurl check
		matched, err = regexp.Match(`^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$`, []byte(certAttr[1]))
		if !matched || err != nil {
			return errors.New("Wrong certificate url format")
		}
		// productname check
		matched, err = regexp.Match(`.{1,120}$`, []byte(certAttr[2]))
		if !matched || err != nil {
			return errors.New("Wrong certificate product name format")
		}
	}
	return nil
}

func checkCertPrivateAttr(certAttr ...string) error {
	// certnumber check
	matched, err := regexp.Match(`^.{1,20}$`, []byte(certAttr[0]))
	if !matched || err != nil {
		return errors.New("Wrong certificate number format")
	}
	// certdate check
	matched, err = regexp.Match(`^\d{8,8}$`, []byte(certAttr[1]))
	if !matched || err != nil {
		return errors.New("Wrong certificate date format")
	}
	// manufacturercode check
	matched, err = regexp.Match(`^.{1,20}$`, []byte(certAttr[2]))
	if !matched || err != nil {
		return errors.New("Wrong certificate manufacturer code format")
	}
	// certcheckcode check
	matched, err = regexp.Match(`^.{1,20}$`, []byte(certAttr[3]))
	if !matched || err != nil {
		return errors.New("Wrong certificate check code format")
	}
	return nil
}

func getMspID(stub shim.ChaincodeStubInterface) (string, error) {
	// generate company code
	creator, _ := stub.GetCreator()      // Check who is trying to access the ledger.
	sID := &msp.SerializedIdentity{}     // Create a SerializedIdentity to hold Unmarshal GetCreator() result
	err := proto.Unmarshal(creator, sID) // Unmarshal the creator from []byte to structure
	return sID.Mspid, err
}

var logger = shim.NewLogger("chaincode")

type SteelCertificateContract struct {
}

func main() {
	if err := shim.Start(new(SteelCertificateContract)); err != nil {
		fmt.Printf("Main: Error starting chaincode: %s", err)
	}
}

func (cc *SteelCertificateContract) Init(stub shim.ChaincodeStubInterface) peer.Response {
	if _, args := stub.GetFunctionAndParameters(); len(args) > 0 {
		return Error(http.StatusBadRequest, "Init: Incorrect number of arguments; no arguments were expected.")
	}
	return Success(http.StatusOK, "OK", nil)
}

func (cc *SteelCertificateContract) Invoke(stub shim.ChaincodeStubInterface) peer.Response {

	function, args := stub.GetFunctionAndParameters()

	switch function {
	case "createByAttributes":
		return cc.createByAttributes(stub, args)
	case "createByID":
		return cc.createByID(stub, args)
	case "getByID":
		return cc.getByID(stub, args)
	case "getByIDAttributes":
		return cc.getByIDAttributes(stub, args)
	case "findByChecksum":
		return cc.findByChecksum(stub, args)
	case "findByChecksumAttributes":
		return cc.findByChecksumAttributes(stub, args)
	default:
		logger.Warningf("Invoke('%s') invalid!", function)
		return Error(http.StatusNotImplemented, "Invalid method! Valid methods are 'createByAttributes|createByID|getByIDAttributes|findByChecksum|findByChecksumAttributes'")
	}
}

func (cc *SteelCertificateContract) getByID(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	id := strings.ToLower(args[0])

	if value, err := stub.GetState(id); err != nil || value == nil {
		return Error(http.StatusNotFound, "Not Found")
	} else {
		var outCert OutCertificate
		outCert.FromJson(value)
		resp := struct {
			Message string         `json:message`
			Code    uint           `json:code`
			Payload OutCertificate `json:payload`
		}{Message: "OK", Code: http.StatusOK, Payload: outCert}
		jsonResp, err := json.Marshal(resp)
		if err != nil {
			return Error(http.StatusInternalServerError, "Error on marshal")
		}
		return Success(http.StatusOK, "OK", jsonResp)
	}
}

func (cc *SteelCertificateContract) createByID(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	var outCert OutCertificate

	transientData, _ := stub.GetTransient()
	for key, value := range transientData {
		if key == "id" {
			outCert.ID = string(value)
		}
		if key == "checksum" {
			outCert.CheckSum = string(value)
		}
		if key == "productname" {
			outCert.ProductName = string(value)
		}
		if key == "status" {
			outCert.Status = string(value)
		}
		if key == "certurl" {
			outCert.CertURL = string(value)
		}
	}

	if value, err := stub.GetState(outCert.ID); !(err == nil && value == nil) {
		return Error(http.StatusConflict, "Certificate Exists")
	}

	if err := checkCertPublicAttr(outCert.Status, outCert.CertURL, outCert.ProductName); err != nil {
		return Error(http.StatusInternalServerError, err.Error())
	}

	// generate company code
	if _, err := getMspID(stub); err != nil {
		return Error(http.StatusInternalServerError, "Cannot get mspid")
	}
	outCert.CompanyCode, _ = getMspID(stub)

	jsonCert, err := json.Marshal(outCert)
	if err != nil {
		return Error(http.StatusInternalServerError, "Error on marshal")
	}
	if err := stub.PutState(outCert.ID, jsonCert); err != nil {
		return Error(http.StatusInternalServerError, err.Error())
	}

	resp := struct {
		Message string         `json:message`
		Code    uint           `json:code`
		Payload OutCertificate `json:payload`
	}{Message: "Certificate Created", Code: http.StatusCreated, Payload: outCert}
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		return Error(http.StatusInternalServerError, "Error on marshal")
	}

	return Success(http.StatusCreated, "Certificate Created", jsonResp)
}

func (cc *SteelCertificateContract) createByAttributes(stub shim.ChaincodeStubInterface, args []string) peer.Response {

	var inCert InCertificate
	var outCert OutCertificate

	transientData, _ := stub.GetTransient()
	for key, value := range transientData {
		if key == "certnumber" {
			inCert.CertNumber = string(value)
		}
		if key == "certdate" {
			inCert.CertDate = string(value)
		}
		if key == "manufacturercode" {
			inCert.ManufacturerCode = string(value)
		}
		if key == "certcheckcode" {
			inCert.CertCheckcode = string(value)
		}
		if key == "productname" {
			inCert.ProductName = string(value)
		}
		if key == "status" {
			inCert.Status = string(value)
		}
		if key == "certurl" {
			inCert.CertURL = string(value)
		}
	}

	err := checkCertPublicAttr(inCert.Status, inCert.CertURL, inCert.ProductName)
	if err != nil {
		return Error(http.StatusInternalServerError, err.Error())
	}
	err = checkCertPrivateAttr(inCert.CertNumber, inCert.CertDate, inCert.ManufacturerCode, inCert.CertCheckcode)
	if err != nil {
		return Error(http.StatusInternalServerError, err.Error())
	}

	// generate company code
	if _, err := getMspID(stub); err != nil {
		return Error(http.StatusInternalServerError, "Cannot get mspid")
	}
	inCert.CompanyCode, _ = getMspID(stub)

	// generate checksums
	outCert.CheckSum = generateChecksum(inCert)

	// generate ID
	outCert.ID = generateID(inCert)

	// write certificate data for blockchain
	outCert.CompanyCode = inCert.CompanyCode
	outCert.ProductName = inCert.ProductName
	outCert.Status = inCert.Status
	outCert.CertURL = inCert.CertURL

	if value, err := stub.GetState(outCert.ID); !(err == nil && value == nil) {
		return Error(http.StatusConflict, "Certificate Exists")
	}
	jsonCert, err := json.Marshal(outCert)
	if err != nil {
		return Error(http.StatusInternalServerError, "Error on marshal")
	}
	if err := stub.PutState(outCert.ID, jsonCert); err != nil {
		return Error(http.StatusInternalServerError, err.Error())
	}

	resp := struct {
		Message string         `json:message`
		Code    uint           `json:code`
		Payload OutCertificate `json:payload`
	}{Message: "Certificate Created", Code: http.StatusCreated, Payload: outCert}
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		return Error(http.StatusInternalServerError, "Error on marshal")
	}

	return Success(http.StatusCreated, "Certificate Created", jsonResp)
}

func (cc *SteelCertificateContract) getByIDAttributes(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	var inCert InCertificate
	var outCert OutCertificate

	inCert.CertNumber = args[0]
	inCert.CertDate = args[1]
	inCert.CompanyCode = args[2]
	inCert.ManufacturerCode = args[3]
	inCert.CertCheckcode = args[4]
	inCert.Status = args[5]

	if err := checkCertPublicAttr(inCert.Status); err != nil {
		return Error(http.StatusInternalServerError, err.Error())
	}
	if err := checkCertPrivateAttr(inCert.CertNumber, inCert.CertDate, inCert.ManufacturerCode, inCert.CertCheckcode); err != nil {
		return Error(http.StatusInternalServerError, err.Error())
	}

	// generate ID
	outCert.ID = generateID(inCert)

	if value, err := stub.GetState(outCert.ID); err != nil || value == nil {
		return Error(http.StatusNotFound, "Not Found")
	} else {
		var outCert OutCertificate
		outCert.FromJson(value)
		resp := struct {
			Message string         `json:message`
			Code    uint           `json:code`
			Payload OutCertificate `json:payload`
		}{Message: "OK", Code: http.StatusOK, Payload: outCert}
		jsonResp, err := json.Marshal(resp)
		if err != nil {
			return Error(http.StatusInternalServerError, "Error on marshal")
		}
		return Success(http.StatusOK, "OK", jsonResp)
	}
}

func (cc *SteelCertificateContract) findByChecksumAttributes(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	var inCert InCertificate

	inCert.CertNumber = args[0]
	inCert.CertDate = args[1]
	inCert.CompanyCode = args[2]
	inCert.ManufacturerCode = args[3]
	inCert.CertCheckcode = args[4]

	if err := checkCertPrivateAttr(inCert.CertNumber, inCert.CertDate, inCert.ManufacturerCode, inCert.CertCheckcode); err != nil {
		return Error(http.StatusInternalServerError, err.Error())
	}

	// generate checksums
	checkSum := generateChecksum(inCert)

	queryString := fmt.Sprintf(`{
		"selector": {
			"checkcsum": "%s"
		}
	}`, checkSum)

	resultsIterator, err := stub.GetQueryResult(queryString)
	if err != nil {
		return Error(http.StatusInternalServerError, err.Error())
	}
	defer resultsIterator.Close()

	var buffer bytes.Buffer
	buffer.WriteString("{ \"values\": [")
	for resultsIterator.HasNext() {
		it, _ := resultsIterator.Next()
		if buffer.Len() > 15 {
			buffer.WriteString(",")
		}
		var outCert OutCertificate
		outCert.FromJson(it.Value)
		buffer.WriteString("{\"id\":\"")
		buffer.WriteString(it.Key)
		buffer.WriteString("\", \"companycode\":\"")
		buffer.WriteString(outCert.CompanyCode)
		buffer.WriteString("\", \"productname\":\"")
		buffer.WriteString(outCert.ProductName)
		buffer.WriteString("\", \"status\":\"")
		buffer.WriteString(outCert.Status)
		buffer.WriteString("\", \"certurl\":\"")
		buffer.WriteString(outCert.CertURL)
		buffer.WriteString("\", \"checkcsum\":\"")
		buffer.WriteString(outCert.CheckSum)
		buffer.WriteString("\"}")
	}
	buffer.WriteString("]}")

	return Success(http.StatusOK, "OK", buffer.Bytes())
}

func (cc *SteelCertificateContract) findByChecksum(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	checkSum := args[0]

	queryString := fmt.Sprintf(`{
		"selector": {
			"checkcsum": "%s"
		}
	}`, checkSum)

	resultsIterator, err := stub.GetQueryResult(queryString)
	if err != nil {
		return Error(http.StatusInternalServerError, err.Error())
	}
	defer resultsIterator.Close()

	var buffer bytes.Buffer
	buffer.WriteString("{ \"values\": [")
	for resultsIterator.HasNext() {
		it, _ := resultsIterator.Next()
		if buffer.Len() > 15 {
			buffer.WriteString(",")
		}
		var outCert OutCertificate
		outCert.FromJson(it.Value)
		buffer.WriteString("{\"id\":\"")
		buffer.WriteString(it.Key)
		buffer.WriteString("\", \"companycode\":\"")
		buffer.WriteString(outCert.CompanyCode)
		buffer.WriteString("\", \"productname\":\"")
		buffer.WriteString(outCert.ProductName)
		buffer.WriteString("\", \"status\":\"")
		buffer.WriteString(outCert.Status)
		buffer.WriteString("\", \"certurl\":\"")
		buffer.WriteString(outCert.CertURL)
		buffer.WriteString("\", \"checkcsum\":\"")
		buffer.WriteString(outCert.CheckSum)
		buffer.WriteString("\"}")
	}
	buffer.WriteString("]}")

	return Success(http.StatusOK, "OK", buffer.Bytes())
}
