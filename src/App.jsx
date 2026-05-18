import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Accueil from "./pages/Accueil";
import CalculateurVitrineVoiture from "./pages/CalculateurVitrineVoiture";
import FormulaireAccueilClient from "./pages/FormulaireAccueilClient";
import FormulaireTransfertFI from "./pages/FormulaireTransfertFI";
import TextePersonnaliseMarketplace from "./pages/TextePersonnaliseMarketplace";
import CalculateurPretInteret from "./pages/CalculateurPretInteret";
import PDFGaranties from "./pages/PDFGaranties";
import FormulaireAvantagePlus from "./pages/FormulaireAvantagePlus";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Accueil />} />
          <Route
            path="/calculateur-vitrine-voiture"
            element={<CalculateurVitrineVoiture />}
          />
          <Route
            path="/calculateur-pret-interet"
            element={<CalculateurPretInteret />}
          />
          <Route
            path="/formulaire-accueil-client"
            element={<FormulaireAccueilClient />}
          />
          <Route
            path="/formulaire-transfert-fi"
            element={<FormulaireTransfertFI />}
          />
          <Route
            path="/texte-personnalise-marketplace"
            element={<TextePersonnaliseMarketplace />}
          />
          <Route
            path="/pdf-garanties"
            element={<PDFGaranties />}
          />
          <Route
            path="/formulaire-avantage-plus"
            element={<FormulaireAvantagePlus />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
