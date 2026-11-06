import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  addRoutePoint,
  gradeRoute,
  isInOrder,
  misplacedPlayers,
  moveItem,
  shuffledOrder,
  spotAt,
  type RouteVerdict,
} from "../../domain/quiz";
import type {
  ChoiceQuestion,
  DragQuestion,
  FreezeQuestion,
  Keyframe,
  OrderQuestion,
  PlaceBothQuestion,
  Placement,
  Player,
  Position,
  QuizQuestion,
  RouteQuestion,
  SpotErrorQuestion,
  Zone,
} from "../../domain/schema";
import { t } from "../../i18n";
import { CourtScene } from "../court/CourtScene";
import { useOrientation, useReducedMotion } from "../court/media";
import styles from "./LessonQuiz.module.css";
import { QuizField } from "./QuizField";
import { RichText } from "./RichText";
import { useStepPlayer } from "./useStepPlayer";

interface QuestionProps {
  /** Wordt bij elke poging aangeroepen. */
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
  isLast: boolean;
  /** In een toets heb je één poging. */
  canRetry: boolean;
}

/** Pauze tussen twee stappen, en langer zonder beweging, zodat je elke stand kunt zien. */
const HOLD_MS = 250;
const HOLD_REDUCED_MS = 1200;

export function Feedback({
  correct,
  explanation,
  note,
  isLast,
  canRetry,
  onRetry,
  onNext,
}: {
  correct: boolean;
  explanation: string;
  /** Wat er precies misging. */
  note?: string;
  isLast: boolean;
  canRetry: boolean;
  onRetry: () => void;
  onNext: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Op een lage telefoon valt de feedback anders onder de vouw.
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: "nearest" });
  }, []);

  return (
    <div
      ref={ref}
      className={correct ? styles.right : styles.wrong}
      role="status"
      data-testid="feedback"
    >
      <p className={styles.verdict}>
        <span aria-hidden="true">{correct ? "✓" : "✗"}</span>{" "}
        {t(correct ? "quiz.correct" : "quiz.wrong")}
      </p>
      <p className={styles.explanation}>
        {note ? `${note} ` : null}
        <RichText source={explanation} />
      </p>
      <div className={styles.actions}>
        {correct || !canRetry ? null : (
          <button type="button" className={styles.button} onClick={onRetry}>
            {t("quiz.retry")}
          </button>
        )}
        <button type="button" className={styles.primary} onClick={onNext}>
          {t(isLast ? "quiz.finish" : "quiz.next")}
        </button>
      </div>
    </div>
  );
}

function Options({
  options,
  correct,
  picked,
  onPick,
}: {
  options: string[];
  correct: number;
  picked: number | null;
  onPick: (index: number) => void;
}) {
  const answered = picked !== null;
  return (
    <div className={styles.options}>
      {options.map((option, index) => (
        <button
          key={option}
          type="button"
          className={styles.option}
          disabled={answered}
          data-testid="option"
          data-state={
            !answered
              ? undefined
              : index === correct
                ? "right"
                : index === picked
                  ? "wrong"
                  : undefined
          }
          onClick={() => onPick(index)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function ChoiceView({
  question,
  onAnswer,
  ...props
}: QuestionProps & { question: ChoiceQuestion }) {
  const [picked, setPicked] = useState<number | null>(null);

  function pick(index: number) {
    setPicked(index);
    onAnswer(index === question.correct);
  }

  return (
    <div className={styles.choice}>
      <p className={styles.prompt}>
        <RichText source={question.prompt} />
      </p>
      <Options
        options={question.options}
        correct={question.correct}
        picked={picked}
        onPick={pick}
      />
      {picked !== null ? (
        <Feedback
          {...props}
          correct={picked === question.correct}
          explanation={question.explanation}
          onRetry={() => setPicked(null)}
        />
      ) : null}
    </div>
  );
}

function placementsOf(question: DragQuestion | PlaceBothQuestion): Placement[] {
  return question.kind === "drag"
    ? [
        {
          playerId: question.playerId,
          target: question.target,
          tolerance: question.tolerance,
        },
      ]
    : question.targets;
}

function targetZones(polygons: Position[][]): Zone[] {
  return polygons.map((polygon, index) => ({
    id: `doel-${index}`,
    kind: "target",
    polygon,
    label: t("quiz.targetLabel"),
  }));
}

function startPositions(
  placements: Pick<Placement, "playerId">[],
  setup: DragQuestion["setup"],
): Record<string, Position> {
  return Object.fromEntries(
    placements.map(({ playerId }) => [
      playerId,
      setup.players[playerId] ?? { x: 0, y: 0 },
    ]),
  );
}

function PlaceView({
  question,
  players,
  onAnswer,
  ...props
}: QuestionProps & {
  question: DragQuestion | PlaceBothQuestion;
  players: Player[];
}) {
  const orientation = useOrientation();
  const placements = placementsOf(question);
  const start = startPositions(placements, question.setup);
  const [positions, setPositions] = useState(start);
  const [misplaced, setMisplaced] = useState<string[] | null>(null);
  const checked = misplaced !== null;

  function check() {
    const wrong = misplacedPlayers(positions, placements);
    setMisplaced(wrong);
    onAnswer(wrong.length === 0);
  }

  function retry() {
    setPositions(start);
    setMisplaced(null);
  }

  const labels = (misplaced ?? []).map(
    (id) => players.find((player) => player.id === id)?.label ?? id,
  );

  return (
    <div className={styles.drag}>
      <div className={styles.field}>
        <QuizField
          view={{ orientation, flipped: false }}
          players={players}
          setup={question.setup}
          arrows={question.arrows}
          zones={[
            ...(question.zones ?? []),
            ...(checked
              ? targetZones(placements.map(({ target }) => target))
              : []),
          ]}
          positions={positions}
          onMove={(id, position) =>
            setPositions((current) => ({ ...current, [id]: position }))
          }
          locked={checked}
        />
      </div>
      <div className={styles.dragPanel}>
        <p className={styles.prompt}>
          <RichText source={question.prompt} />
        </p>
        <p className={styles.srOnly}>{t("quiz.keyboardHint")}</p>
        {checked ? (
          <Feedback
            {...props}
            correct={misplaced.length === 0}
            explanation={question.explanation}
            note={
              placements.length > 1 && labels.length > 0
                ? t("quiz.notPlaced", { players: labels.join(", ") })
                : undefined
            }
            onRetry={retry}
          />
        ) : (
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={check}>
              {t("quiz.check")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const ROUTE_NOTES: Record<Exclude<RouteVerdict, "ok">, string> = {
  end: t("quiz.routeEnd"),
  detour: t("quiz.routeDetour"),
  net: t("quiz.routeNet"),
};

function RouteView({
  question,
  players,
  onAnswer,
  ...props
}: QuestionProps & { question: RouteQuestion; players: Player[] }) {
  const orientation = useOrientation();
  const start = question.setup.players[question.playerId] ?? { x: 0, y: 0 };
  const [route, setRoute] = useState<Position[]>([start]);
  const [position, setPosition] = useState(start);
  const [verdict, setVerdict] = useState<RouteVerdict | null>(null);
  const checked = verdict !== null;

  function check() {
    const result = gradeRoute([...route, position], question);
    setVerdict(result);
    onAnswer(result === "ok");
  }

  function reset() {
    setRoute([start]);
    setPosition(start);
    setVerdict(null);
  }

  return (
    <div className={styles.drag}>
      <div className={styles.field}>
        <QuizField
          view={{ orientation, flipped: false }}
          players={players}
          setup={question.setup}
          arrows={question.arrows}
          zones={[
            ...(question.zones ?? []),
            ...(checked ? targetZones([question.target]) : []),
          ]}
          positions={{ [question.playerId]: position }}
          onMove={(_id, next) => {
            setPosition(next);
            setRoute((current) => addRoutePoint(current, next));
          }}
          locked={checked}
          trail={[...route, position]}
        />
      </div>
      <div className={styles.dragPanel}>
        <p className={styles.prompt}>
          <RichText source={question.prompt} />
        </p>
        {checked ? (
          <Feedback
            {...props}
            correct={verdict === "ok"}
            explanation={question.explanation}
            note={verdict === "ok" ? undefined : ROUTE_NOTES[verdict]}
            onRetry={reset}
          />
        ) : (
          <>
            <p className={styles.hint}>{t("quiz.routeHint")}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.button} onClick={reset}>
                {t("quiz.routeClear")}
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={route.length < 2}
                onClick={check}
              >
                {t("quiz.check")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Speelt de stappen af en blijft op de laatste staan. */
function useScene(keyframes: Keyframe[]) {
  const reducedMotion = useReducedMotion();
  const last = keyframes.length - 1;
  // Zonder beweging begin je op het beslissende moment; opnieuw bekijken gaat stap voor stap.
  const player = useStepPlayer(keyframes, reducedMotion ? last : 0);
  const [playing, setPlaying] = useState(!reducedMotion);
  const { step, moving, next, goTo } = player;

  useEffect(() => {
    if (!playing || moving || step >= last) return;
    const timer = setTimeout(next, reducedMotion ? HOLD_REDUCED_MS : HOLD_MS);
    return () => clearTimeout(timer);
  }, [playing, moving, step, last, next, reducedMotion]);

  return {
    player,
    replay: () => {
      setPlaying(true);
      goTo(0);
    },
  };
}

function SceneLayout({
  question,
  players,
  zones,
  onTap,
  children,
}: {
  question: FreezeQuestion | SpotErrorQuestion;
  players: Player[];
  zones?: Zone[];
  onTap?: (
    point: Position,
    hitRadius: number,
    frame: Record<string, Position>,
  ) => void;
  children: ReactNode;
}) {
  const orientation = useOrientation();
  const { keyframes, alt } = question.scene;
  const { player, replay } = useScene(keyframes);
  const { frame, keyframe } = player;

  return (
    <div className={styles.drag}>
      <div className={styles.field}>
        <CourtScene
          view={{ orientation, flipped: false }}
          players={players}
          frame={frame}
          arrows={keyframe?.arrows}
          zones={[...(keyframe?.zones ?? []), ...(zones ?? [])]}
          onTap={
            onTap
              ? (point, radius) => onTap(point, radius, frame.players)
              : undefined
          }
        />
      </div>
      <div className={styles.dragPanel}>
        <p className={styles.prompt}>
          <RichText source={question.prompt} />
        </p>
        <p className={styles.srOnly}>{alt}</p>
        {children}
        <button type="button" className={styles.button} onClick={replay}>
          {t("quiz.replay")}
        </button>
      </div>
    </div>
  );
}

function FreezeView({
  question,
  players,
  onAnswer,
  ...props
}: QuestionProps & { question: FreezeQuestion; players: Player[] }) {
  const [picked, setPicked] = useState<number | null>(null);

  function pick(index: number) {
    setPicked(index);
    onAnswer(index === question.correct);
  }

  return (
    <SceneLayout question={question} players={players}>
      <Options
        options={question.options}
        correct={question.correct}
        picked={picked}
        onPick={pick}
      />
      {picked !== null ? (
        <Feedback
          {...props}
          correct={picked === question.correct}
          explanation={question.explanation}
          onRetry={() => setPicked(null)}
        />
      ) : null}
    </SceneLayout>
  );
}

function SpotErrorView({
  question,
  players,
  onAnswer,
  ...props
}: QuestionProps & { question: SpotErrorQuestion; players: Player[] }) {
  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;

  function pick(id: string) {
    setPicked(id);
    onAnswer(id === question.correct);
  }

  const zones = question.spots.flatMap((spot): Zone[] =>
    spot.polygon
      ? [
          {
            id: spot.id,
            kind: spot.id === picked ? "blocked" : "cover",
            polygon: spot.polygon,
            label: spot.label,
          },
        ]
      : [],
  );

  return (
    <SceneLayout
      question={question}
      players={players}
      zones={zones}
      onTap={(point, radius, frame) => {
        if (answered) return;
        const id = spotAt(point, question.spots, frame, radius);
        if (id) pick(id);
      }}
    >
      <div className={styles.spots} role="group" aria-label={t("quiz.spots")}>
        {question.spots.map((spot) => (
          <button
            key={spot.id}
            type="button"
            className={styles.option}
            disabled={answered}
            data-testid="option"
            data-state={
              !answered
                ? undefined
                : spot.id === question.correct
                  ? "right"
                  : spot.id === picked
                    ? "wrong"
                    : undefined
            }
            onClick={() => pick(spot.id)}
          >
            {spot.label}
          </button>
        ))}
      </div>
      {answered ? (
        <Feedback
          {...props}
          correct={picked === question.correct}
          explanation={question.explanation}
          onRetry={() => setPicked(null)}
        />
      ) : null}
    </SceneLayout>
  );
}

function OrderView({
  question,
  onAnswer,
  ...props
}: QuestionProps & { question: OrderQuestion }) {
  const start = shuffledOrder(question.items.length, question.id);
  const [order, setOrder] = useState(start);
  const [checked, setChecked] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const correct = isInOrder(order);

  function move(index: number, delta: -1 | 1) {
    const next = moveItem(order, index, delta);
    if (next === order) return;
    setOrder(next);
    const item = question.items[order[index] ?? 0] ?? "";
    setAnnouncement(t("quiz.moved", { item, place: index + delta + 1 }));
  }

  function check() {
    setChecked(true);
    onAnswer(correct);
  }

  return (
    <div className={styles.choice}>
      <p className={styles.prompt}>
        <RichText source={question.prompt} />
      </p>
      <ol className={styles.orderList}>
        {order.map((item, index) => {
          const text = question.items[item] ?? "";
          return (
            <li
              key={item}
              className={styles.orderItem}
              data-state={
                !checked ? undefined : item === index ? "right" : "wrong"
              }
            >
              <span className={styles.orderText}>{text}</span>
              {checked ? null : (
                <>
                  {/* Niet disabled: dan raakt de focus kwijt zodra een item bovenaan komt. */}
                  <button
                    type="button"
                    className={styles.moveButton}
                    aria-label={t("quiz.moveUp", { item: text })}
                    aria-disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    type="button"
                    className={styles.moveButton}
                    aria-label={t("quiz.moveDown", { item: text })}
                    aria-disabled={index === order.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ol>
      <p className={styles.srOnly} role="status">
        {announcement}
      </p>
      {checked ? (
        <Feedback
          {...props}
          correct={correct}
          explanation={question.explanation}
          onRetry={() => {
            setOrder(start);
            setChecked(false);
            setAnnouncement("");
          }}
        />
      ) : (
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={check}>
            {t("quiz.check")}
          </button>
        </div>
      )}
    </div>
  );
}

export function QuestionView({
  question,
  players,
  ...props
}: QuestionProps & { question: QuizQuestion; players: Player[] }) {
  switch (question.kind) {
    case "choice":
      return <ChoiceView question={question} {...props} />;
    case "drag":
    case "placeBoth":
      return <PlaceView question={question} players={players} {...props} />;
    case "route":
      return <RouteView question={question} players={players} {...props} />;
    case "freeze":
      return <FreezeView question={question} players={players} {...props} />;
    case "spotError":
      return <SpotErrorView question={question} players={players} {...props} />;
    case "order":
      return <OrderView question={question} {...props} />;
  }
}
