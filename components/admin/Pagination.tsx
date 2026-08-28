import React, {
  useMemo,
} from "react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  itemsPerPage: number;

  setCurrentPage:
    (page: number) => void;

  setItemsPerPage:
    (size: number) => void;
}

interface NavigationButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
  hideOnMobile?: boolean;
}

const NavigationButton:
  React.FC<
    NavigationButtonProps
  > = ({
    label,
    disabled,
    onClick,
    children,
    hideOnMobile = false,
  }) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500 ${
        hideOnMobile
          ? "hidden sm:flex"
          : "flex"
      }`}
    >
      {children}
    </button>
  );

export const Pagination:
  React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    startIndex,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
  }) => {
    const safeTotalPages =
      Math.max(1, totalPages);

    const safeCurrentPage =
      Math.min(
        Math.max(1, currentPage),
        safeTotalPages,
      );

    const firstVisibleItem =
      totalItems > 0
        ? startIndex + 1
        : 0;

    const lastVisibleItem =
      Math.min(
        startIndex +
          itemsPerPage,
        totalItems,
      );

    const visiblePages =
      useMemo(() => {
        const maximumButtons = 5;

        if (
          safeTotalPages <=
          maximumButtons
        ) {
          return Array.from(
            {
              length:
                safeTotalPages,
            },
            (_, index) =>
              index + 1,
          );
        }

        let firstPage =
          safeCurrentPage - 2;

        let lastPage =
          safeCurrentPage + 2;

        if (firstPage < 1) {
          firstPage = 1;
          lastPage =
            maximumButtons;
        }

        if (
          lastPage >
          safeTotalPages
        ) {
          lastPage =
            safeTotalPages;

          firstPage =
            safeTotalPages -
            maximumButtons +
            1;
        }

        return Array.from(
          {
            length:
              lastPage -
              firstPage +
              1,
          },
          (_, index) =>
            firstPage + index,
        );
      }, [
        safeCurrentPage,
        safeTotalPages,
      ]);

    if (totalItems === 0) {
      return null;
    }

    const goToPage = (
      requestedPage: number,
    ) => {
      const nextPage = Math.min(
        Math.max(
          requestedPage,
          1,
        ),
        safeTotalPages,
      );

      setCurrentPage(nextPage);
    };

    return (
      <nav
        aria-label="การแบ่งหน้ารายการคำร้อง"
        className="mb-10 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5"
      >
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
          <p
            className="text-[11px] font-semibold text-slate-500"
            aria-live="polite"
          >
            แสดง{" "}
            <span className="font-bold text-slate-900">
              {firstVisibleItem.toLocaleString(
                "th-TH",
              )}
            </span>
            {" – "}
            <span className="font-bold text-slate-900">
              {lastVisibleItem.toLocaleString(
                "th-TH",
              )}
            </span>
            {" จาก "}
            <span className="font-bold text-blue-700">
              {totalItems.toLocaleString(
                "th-TH",
              )}
            </span>
            {" รายการ"}
          </p>

          <div className="flex items-center gap-2">
            <label
              htmlFor="admin-page-size"
              className="hidden text-[10px] font-semibold text-slate-400 lg:block"
            >
              ต่อหน้า
            </label>

            <select
              id="admin-page-size"
              value={itemsPerPage}
              onChange={(event) => {
                const newPageSize =
                  Number(
                    event.target.value,
                  );

                setItemsPerPage(
                  newPageSize,
                );

                setCurrentPage(1);
              }}
              className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none transition hover:bg-slate-100 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              <option value={10}>
                10
              </option>

              <option value={20}>
                20
              </option>

              <option value={50}>
                50
              </option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5">
          <NavigationButton
            label="หน้าแรก"
            disabled={
              safeCurrentPage === 1
            }
            onClick={() =>
              goToPage(1)
            }
            hideOnMobile
          >
            <ChevronFirst className="h-4 w-4" />
          </NavigationButton>

          <NavigationButton
            label="หน้าก่อนหน้า"
            disabled={
              safeCurrentPage === 1
            }
            onClick={() =>
              goToPage(
                safeCurrentPage - 1,
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </NavigationButton>

          <div className="mx-1 flex items-center gap-1">
            {visiblePages.map(
              (page) => {
                const isCurrent =
                  page ===
                  safeCurrentPage;

                return (
                  <button
                    type="button"
                    key={page}
                    aria-label={`ไปหน้าที่ ${page}`}
                    aria-current={
                      isCurrent
                        ? "page"
                        : undefined
                    }
                    onClick={() =>
                      goToPage(page)
                    }
                    className={`h-9 min-w-9 rounded-xl px-2 text-xs font-bold transition ${
                      isCurrent
                        ? "bg-blue-700 text-white shadow-md shadow-blue-200"
                        : "border border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-blue-700"
                    }`}
                  >
                    {page}
                  </button>
                );
              },
            )}
          </div>

          <NavigationButton
            label="หน้าถัดไป"
            disabled={
              safeCurrentPage ===
              safeTotalPages
            }
            onClick={() =>
              goToPage(
                safeCurrentPage + 1,
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </NavigationButton>

          <NavigationButton
            label="หน้าสุดท้าย"
            disabled={
              safeCurrentPage ===
              safeTotalPages
            }
            onClick={() =>
              goToPage(
                safeTotalPages,
              )
            }
            hideOnMobile
          >
            <ChevronLast className="h-4 w-4" />
          </NavigationButton>
        </div>
      </nav>
    );
  };