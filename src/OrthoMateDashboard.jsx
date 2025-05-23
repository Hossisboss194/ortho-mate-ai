// Ortho Mate AI Full Front-End (OrthoMateDashboard Component)

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Checkbox } from "./components/ui/checkbox";
import { Select, SelectItem } from "./components/ui/select";
import htmlDocx from 'html-docx-js/dist/html-docx';
import { saveAs } from 'file-saver';
import jsPDF from "jspdf";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDWJIk0a9zfWFsoUfmua87M0567mMecfjk",
  authDomain: "orthomateai.firebaseapp.com",
  projectId: "orthomateai",
  storageBucket: "orthomateai.firebasestorage.app",
  messagingSenderId: "591592539521",
  appId: "1:591592539521:web:d9bc41dd8acc8a763e5480"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function OrthoMateDashboard() {
  const templates = [
    "Rotator Cuff Tear",
    "Carpal Tunnel Syndrome",
    "Hip Arthritis",
    "Knee Arthritis",
    "Meniscus Tear",
    "Distal Radius Fracture"
  ];

  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [note, setNote] = useState("");
  const [guidelineFlags, setGuidelineFlags] = useState({ ptTried: false, injectionTried: false });
  const [nextSteps, setNextSteps] = useState({ mri: false, referral: false, surgery: false });
  const [patientInfo, setPatientInfo] = useState({ name: '', dob: '', mrn: '' });
  const [records, setRecords] = useState([]);
  const [analytics, setAnalytics] = useState({ totalNotes: 0, templateCount: {}, complianceFlags: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    generateTemplateNote();
  }, [guidelineFlags, nextSteps, selectedTemplate]);

  const generateTemplateNote = () => {
    let base = `Patient is being evaluated for ${selectedTemplate}.\n`;
    if (guidelineFlags.ptTried) base += `Physical therapy attempted.\n`;
    if (guidelineFlags.injectionTried) base += `Cortisone injection attempted.\n`;
    if (nextSteps.mri) base += `MRI ordered.\n`;
    if (nextSteps.referral) base += `Referral to specialist made.\n`;
    if (nextSteps.surgery) base += `Surgical intervention scheduled.\n`;
    base += `Note aligns with MTUS/ODG standards.`;
    setNote(base);
  };

  const handleStartRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    const audioChunks = [];

    mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-1");
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
  Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
},
        body: formData
      });
      const data = await response.json();
      setNote(data.text);
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSaveRecord = async () => {
    const timestamp = new Date().toISOString();
    const record = {
      patient: patientInfo,
      template: selectedTemplate,
      note,
      date: timestamp
    };
    try {
      await addDoc(collection(db, "notes"), record);
      setAnalytics(prev => ({
        ...prev,
        totalNotes: prev.totalNotes + 1,
        templateCount: {
          ...prev.templateCount,
          [selectedTemplate]: (prev.templateCount[selectedTemplate] || 0) + 1
        }
      }));
      alert("Note saved to database.");
    } catch (e) {
      alert("Error saving note: " + e.message);
    }
  };

  const handleExportToWord = () => {
    const converted = htmlDocx.asBlob(`<!DOCTYPE html><html><body><pre>${note}</pre></body></html>`);
    saveAs(converted, `${selectedTemplate.replace(/\s+/g, '_')}_Note.docx`);
  };

  const handleExportToPDF = () => {
    const doc = new jsPDF();
    doc.text(note, 10, 10);
    doc.save(`${selectedTemplate.replace(/\s+/g, '_')}_Note.pdf`);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(note);
      alert("Note copied to clipboard.");
    } catch {
      alert("Failed to copy note.");
    }
  };

  const handleSearch = async () => {
    const notesRef = collection(db, "notes");
    const q = query(notesRef, where("template", "==", searchQuery));
    const snapshot = await getDocs(q);
    setSearchResults(snapshot.docs.map(doc => doc.data()));
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-center">Ortho Mate AI</h1>
      <Input placeholder="Patient Name" value={patientInfo.name} onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })} />
      <Input placeholder="DOB" value={patientInfo.dob} onChange={(e) => setPatientInfo({ ...patientInfo, dob: e.target.value })} />
      <Input placeholder="MRN" value={patientInfo.mrn} onChange={(e) => setPatientInfo({ ...patientInfo, mrn: e.target.value })} />

      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
        {templates.map((template) => (<SelectItem key={template} value={template}>{template}</SelectItem>))}
      </Select>

      <Card><CardContent>
        <Button onClick={handleStartRecording} disabled={isRecording}>Start Dictation</Button>
        <Button onClick={handleStopRecording} disabled={!isRecording}>Stop</Button>
        <Textarea rows={8} value={note} onChange={(e) => setNote(e.target.value)} />
      </CardContent></Card>

      <Button onClick={handleExportToWord}>Export Word</Button>
      <Button onClick={handleExportToPDF}>Export PDF</Button>
      <Button onClick={handleCopyToClipboard}>Copy</Button>
      <Button onClick={handleSaveRecord}>Save</Button>

      <Card><CardContent>
        <label>Guidelines:</label>
        <Checkbox checked={guidelineFlags.ptTried} onCheckedChange={(checked) => setGuidelineFlags({ ...guidelineFlags, ptTried: checked })} label="PT Tried" />
        <Checkbox checked={guidelineFlags.injectionTried} onCheckedChange={(checked) => setGuidelineFlags({ ...guidelineFlags, injectionTried: checked })} label="Injection Tried" />
      </CardContent></Card>

      <Card><CardContent>
        <label>Next Steps:</label>
        <Checkbox checked={nextSteps.mri} onCheckedChange={(checked) => setNextSteps({ ...nextSteps, mri: checked })} label="Order MRI" />
        <Checkbox checked={nextSteps.referral} onCheckedChange={(checked) => setNextSteps({ ...nextSteps, referral: checked })} label="Refer" />
        <Checkbox checked={nextSteps.surgery} onCheckedChange={(checked) => setNextSteps({ ...nextSteps, surgery: checked })} label="Schedule Surgery" />
      </CardContent></Card>

      <Card><CardContent>
        <Input placeholder="Search by Template" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <Button onClick={handleSearch}>Search</Button>
        {searchResults.map((r, i) => (
          <div key={i}><p><strong>{r.template}</strong>: {r.date}</p><pre>{r.note}</pre></div>
        ))}
      </CardContent></Card>
    </div>
  );
}
