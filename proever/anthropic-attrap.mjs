// Står i stedet for @anthropic-ai/sdk under afprøvning. Svarer som modellen
// ville, uden at koste noget eller kræve en nøgle.
export default class Anthropic {
  constructor() {
    this.messages = {
      create: async ({ messages }) => {
        const prompt = messages[0].content;
        const erOpsamling = prompt.includes("ALLE GRUPPERS BEGRUNDELSER");
        return {
          stop_reason: "end_turn",
          content: [{
            type: "text",
            text: erOpsamling
              ? "To misforståelser går igen.\n\nFlere grupper læser en høj bruttomargin som et tegn på dagligvarehandel."
              : "Gruppen læser bruttomarginen rigtigt, men vender konklusionen om på profil C.\n\nSpørg dem, hvorfor en høj margin udelukker dagligvarer.",
          }],
        };
      },
    };
  }
}
