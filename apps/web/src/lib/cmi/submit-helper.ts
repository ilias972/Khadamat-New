/**
 * submitCmiForm
 *
 * Soumet un formulaire CMI de manière programmatique.
 * Crée un formulaire HTML invisible, l'injecte dans le DOM, et le soumet.
 * Cela déclenche une redirection navigateur vers la gateway CMI.
 *
 * @param actionUrl - URL de la gateway CMI (ex: https://testpayment.cmi.co.ma/fim/est3Dgate)
 * @param fields - Objet contenant tous les champs du formulaire (clientid, oid, amount, hash, etc.)
 */
export function submitCmiForm(actionUrl: string, fields: Record<string, string>): void {
  // 1. Créer le formulaire
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.style.display = 'none';

  // 2. Créer les inputs hidden pour chaque champ
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value || '';
    form.appendChild(input);
  });

  // 3. Ajouter le formulaire au DOM
  document.body.appendChild(form);

  // 4. Soumettre le formulaire (déclenche la redirection navigateur)
  form.submit();

  // Note: Le formulaire ne sera jamais retiré car la page sera redirigée
  // vers la gateway CMI. Si l'utilisateur revient (back button), la page
  // sera rechargée donc le formulaire disparaîtra.
}
