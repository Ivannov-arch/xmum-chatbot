import { MessageSquarePlus } from "lucide-react";

type SuggestionModalPreviewProps = { refined?: boolean };

function BackgroundChat() {
  return (
    <div className="preview-app" aria-hidden="true">
      <aside className="preview-sidebar">
        <div className="preview-sidebar-brand">
          <span className="preview-seal">✳</span>
          <span><strong>XMUM</strong><small>Campus companion</small></span>
        </div>
        <div className="preview-search">Search campus answers…</div>
        <p className="preview-topic preview-topic--active">Library and study spaces</p>
        <p className="preview-topic">Campus facilities</p>
        <p className="preview-topic">Student services</p>
      </aside>
      <section className="preview-chat">
        <header className="preview-chat-header">
          <strong>Captain Kah Kee</strong>
          <span className="preview-online">● Online</span>
        </header>
        <div className="preview-messages">
          <div className="preview-message preview-message--user">When does the library close on weekends?</div>
          <div className="preview-message">
            I couldn’t find a verified answer for that question yet.
            <br />
            <span className="preview-low-confidence">Suggest this question</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function CurrentForm() {
  return (
    <div className="ca-modal-overlay">
      <section className="ca-modal" role="dialog" aria-modal="true" aria-labelledby="current-suggest-title">
        <div className="flex items-center justify-between">
          <h3 id="current-suggest-title" className="flex items-center gap-2 font-bold text-lg">
            <MessageSquarePlus size={19} /> Suggest a Question
          </h3>
          <button className="text-xl leading-none" type="button" aria-label="Close suggestion form">✕</button>
        </div>
        <p>Help us improve the chatbot by submitting a question we should know the answer to.</p>
        <div className="space-y-3">
          <div>
            <label>Your Question *</label>
            <input defaultValue="When does the library close on weekends?" />
          </div>
          <div>
            <label>
              Your Answer <span className="text-slate-600 normal-case font-normal">(optional — share if you know it!)</span>
            </label>
            <textarea rows={3} placeholder="Share an answer if you know it." />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border" type="button">Cancel</button>
          <button id="submit-suggestion-btn" className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold" type="button">Submit Suggestion</button>
        </div>
      </section>
    </div>
  );
}

function RefinedForm() {
  return (
    <div className="ca-modal-overlay">
      <section className="ca-modal ca-suggest-modal" role="dialog" aria-modal="true" aria-labelledby="refined-suggest-title">
        <header className="ca-suggest-modal__header">
          <div className="ca-suggest-modal__identity">
            <span className="ca-suggest-modal__icon"><MessageSquarePlus size={21} aria-hidden="true" /></span>
            <div>
              <p className="ca-suggest-modal__eyebrow">XMUM CAMPUS ASSISTANT</p>
              <h3 id="refined-suggest-title" className="ca-suggest-modal__title">Suggest a question</h3>
            </div>
          </div>
          <button className="ca-suggest-modal__close" type="button" aria-label="Close suggestion form">×</button>
        </header>

        <p className="ca-suggest-modal__description">
          Help us improve the chatbot by submitting a question we should know the answer to.
        </p>

        <div className="ca-suggest-modal__fields">
          <div>
            <div className="ca-suggest-modal__label-row">
              <label className="ca-suggest-modal__label" htmlFor="refined-question">Your question <span className="ca-suggest-modal__required">*</span></label>
              <span className="ca-suggest-modal__optional">Required</span>
            </div>
            <input id="refined-question" className="ca-suggest-modal__input" defaultValue="When does the library close on weekends?" />
          </div>
          <div>
            <div className="ca-suggest-modal__label-row">
              <label className="ca-suggest-modal__label" htmlFor="refined-answer">Suggested answer</label>
              <span className="ca-suggest-modal__optional">Optional</span>
            </div>
            <textarea id="refined-answer" className="ca-suggest-modal__textarea" placeholder="Share an answer if you know it." rows={4} />
            <p className="ca-suggest-modal__hint">Only include an answer if you’re confident it’s accurate.</p>
          </div>
        </div>

        <footer className="ca-suggest-modal__footer">
          <button className="ca-suggest-modal__action ca-suggest-modal__cancel" type="button">Cancel</button>
          <button className="ca-suggest-modal__action ca-suggest-modal__submit" type="button">Submit suggestion</button>
        </footer>
      </section>
    </div>
  );
}

export function SuggestionModalPreview({ refined = false }: SuggestionModalPreviewProps) {
  return (
    <main className="suggestion-preview">
      <BackgroundChat />
      {refined ? <RefinedForm /> : <CurrentForm />}
    </main>
  );
}
