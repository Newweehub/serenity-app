import './ConfirmModal.css';

export default function ConfirmModal({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, children }) {
  return (
    <div className="modal-backdrop fade-in" onClick={onCancel}>
      <div className="modal-box fade-up" onClick={e => e.stopPropagation()}>
        {title && <h3 className="modal-title">{title}</h3>}
        {message && <p className="modal-message">{message}</p>}
        {children}
        <div className="modal-actions">
          <button className="modal-btn confirm" onClick={onConfirm}>{confirmLabel}</button>
          <button className="modal-btn cancel"  onClick={onCancel}>{cancelLabel}</button>
        </div>
      </div>
    </div>
  );
}
