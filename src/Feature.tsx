import { useEffect, useState } from "react";
import {
  PersonalQR,
  makeScanPayload,
  usePerPeerValue,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };
type Sig = { name: string; comment: string; ts: number };

const NAME_KEY = (p: string) => `${p}:displayName`;
const EMPTY_SIG: Sig = { name: "", comment: "", ts: 0 };

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <div className="viral-screen">
        <h1>petition</h1>
        <p className="viral-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY(config.storagePrefix)) ?? "",
  );
  const [comment, setComment] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [, rerender] = useState(0);

  const signatures = usePerPeerValue<Sig>(room, "signatures", EMPTY_SIG);

  useEffect(() => {
    if (name) localStorage.setItem(NAME_KEY(config.storagePrefix), name);
  }, [name, config.storagePrefix]);

  useEffect(() => {
    const meta = room.doc.getMap<string>("meta");
    const cb = () => rerender((n) => n + 1);
    meta.observe(cb);
    return () => {
      meta.unobserve(cb);
    };
  }, [room]);

  const meta = room.doc.getMap<string>("meta");
  const title = meta.get("title") ?? "";
  const body = meta.get("body") ?? "";

  const sign = () => {
    if (!name.trim()) return;
    signatures.setMy({ name: name.trim(), comment: comment.trim(), ts: Date.now() });
    setComment("");
  };
  const unsign = () => signatures.clearMy();

  const saveMeta = () => {
    room.doc.transact(() => {
      meta.set("title", titleDraft.trim());
      meta.set("body", bodyDraft.trim());
    });
    setEditing(false);
  };

  const sigList: Array<Sig & { peerId: string }> = signatures.entries
    .map(([peerId, v]) => ({ ...v, peerId }))
    .sort((a, b) => b.ts - a.ts);

  const mySig = signatures.valueOf(room.peerId);
  const roomUrl = `${location.origin}${location.pathname}`;
  const inviteQR = makeScanPayload(room.roomId, "PETITION", title);

  const exportSignatures = () => {
    const csv =
      "timestamp_iso,name,comment\n" +
      sigList
        .map(
          (s) =>
            `"${new Date(s.ts).toISOString()}","${s.name.replace(/"/g, '""')}","${s.comment.replace(/"/g, '""')}"`,
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `signatures-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="viral-screen">
      <header>
        <h1>petition</h1>
        <p className="viral-status">
          <strong>{sigList.length}</strong> signatures · {room.peerCount + 1} present
        </p>
      </header>

      <section>
        {editing ? (
          <form
            className="pe-edit"
            onSubmit={(e) => {
              e.preventDefault();
              saveMeta();
            }}
          >
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="petition title"
              maxLength={200}
              autoFocus
              className="viral-name"
            />
            <textarea
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              placeholder="what you're asking for and why"
              rows={4}
              className="pe-body"
            />
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button type="submit" className="viral-primary">
                save
              </button>
              <button type="button" className="viral-ghost" onClick={() => setEditing(false)}>
                cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="pe-display"
            onClick={() => {
              setTitleDraft(title);
              setBodyDraft(body);
              setEditing(true);
            }}
          >
            <strong>{title || "untitled petition (tap to edit)"}</strong>
            {body && <p>{body}</p>}
          </button>
        )}
      </section>

      {!mySig ? (
        <section>
          <h2 className="viral-section-title">add your signature</h2>
          <input
            className="viral-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="your name"
            maxLength={48}
          />
          <input
            className="viral-name"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="why you're signing (optional)"
            maxLength={200}
            style={{ marginTop: "0.3rem" }}
          />
          <button
            type="button"
            className="viral-primary"
            onClick={sign}
            disabled={!name.trim()}
            style={{ marginTop: "0.4rem" }}
          >
            ✓ sign petition
          </button>
        </section>
      ) : (
        <section className="pe-signed">
          <p>
            ✓ you signed as <strong>{mySig.name}</strong>
          </p>
          <button type="button" className="viral-ghost" onClick={unsign}>
            unsign
          </button>
        </section>
      )}

      <section>
        <h2 className="viral-section-title">share to spread it</h2>
        <p className="viral-status">
          have people scan this QR (or visit <a href={roomUrl}>{roomUrl}</a>)
        </p>
        <PersonalQR payload={inviteQR} size={180} />
      </section>

      <section>
        <h2 className="viral-section-title">signatures ({sigList.length})</h2>
        {sigList.length === 0 ? (
          <p className="viral-empty">no signatures yet</p>
        ) : (
          <ul className="pe-list">
            {sigList.map((s) => (
              <li key={s.peerId} className={s.peerId === room.peerId ? "is-me" : ""}>
                <strong>{s.name}</strong>
                {s.comment && <em> — {s.comment}</em>}
                <span className="pe-time">{new Date(s.ts).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="viral-ghost"
          onClick={exportSignatures}
          disabled={sigList.length === 0}
          style={{ marginTop: "0.4rem" }}
        >
          export CSV
        </button>
      </section>
    </div>
  );
}
