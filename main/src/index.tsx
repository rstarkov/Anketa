import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TestAnketaFormPage } from "./TestAnketaFormPage";
import { TestAnketaBasicPage } from "./TestAnketaBasicPage";

const theme = createTheme({});

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <LocalizationProvider dateAdapter={AdapterLuxon} adapterLocale="en-gb">
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<div><h1>Anketa Dev</h1></div>} />
                        <Route path="/test/basic" element={<TestAnketaBasicPage />} />
                        <Route path="/test/form" element={<TestAnketaFormPage />} />
                    </Routes>
                </BrowserRouter>
            </LocalizationProvider>
        </ThemeProvider>
    </React.StrictMode>
);
