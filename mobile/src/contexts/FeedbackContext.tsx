import React, { createContext, useCallback, useContext, useState } from "react";
import { Feedback } from "../components/Feedback";

type FeedbackType = "success" | "error" | "info";

interface FeedbackContextType {
  showFeedback: (message: string, type?: FeedbackType) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(
  undefined
);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<FeedbackType>("info");

  const showFeedback = useCallback(
    (msg: string, feedbackType: FeedbackType = "info") => {
      setMessage(msg);
      setType(feedbackType);
      setVisible(true);
    },
    []
  );

  return (
    <FeedbackContext.Provider value={{ showFeedback }}>
      {children}
      <Feedback
        visible={visible}
        message={message}
        type={type}
        onHide={() => setVisible(false)}
      />
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }
  return context;
};
