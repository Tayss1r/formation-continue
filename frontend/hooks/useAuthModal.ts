"use client";

import { useState, useCallback } from "react";

type ModalType = "login" | "register" | null;

export function useAuthModal() {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openLogin = useCallback(() => {
    setModalType("login");
    setIsOpen(true);
  }, []);

  const openRegister = useCallback(() => {
    setModalType("register");
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Delay clearing modal type to allow close animation
    setTimeout(() => setModalType(null), 200);
  }, []);

  const switchToLogin = useCallback(() => {
    setModalType("login");
  }, []);

  const switchToRegister = useCallback(() => {
    setModalType("register");
  }, []);

  return {
    isOpen,
    modalType,
    isLoginOpen: isOpen && modalType === "login",
    isRegisterOpen: isOpen && modalType === "register",
    openLogin,
    openRegister,
    close,
    switchToLogin,
    switchToRegister,
  };
}
