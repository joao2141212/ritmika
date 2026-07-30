export const operationAnswerUiContract = Object.freeze({
    flow: '[data-testid="execution-guided-flow"]',
    currentItem: '[data-testid="execution-current-item"]',
    progress: '[role="progressbar"][aria-label="Progresso da execução"]',
    done: '[data-answer="done"]',
    notDone: '[data-answer="not-done"]',
    notApplicable: '[data-answer="not-applicable"]',
    nextButtonName: 'Próximo',
    completeButtonName: 'Revisar e concluir',
});

export const inspectOperationAnswerUi = async (page) => {
    const selectors = operationAnswerUiContract;
    const result = await page.evaluate((contract) => {
        const visible = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return false;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        };
        const pressedValue = (selector) => document.querySelector(selector)?.getAttribute('aria-pressed') ?? null;
        return {
            flowVisible: visible(contract.flow),
            currentItemVisible: visible(contract.currentItem),
            progressVisible: visible(contract.progress),
            doneVisible: visible(contract.done),
            notDoneVisible: visible(contract.notDone),
            donePressed: pressedValue(contract.done),
            notDonePressed: pressedValue(contract.notDone),
        };
    }, selectors);

    const failures = Object.entries(result)
        .filter(([key, value]) => key.endsWith('Visible') && value !== true)
        .map(([key]) => key);

    return {
        status: failures.length === 0 ? 'passed' : 'failed',
        failures,
        ...result,
    };
};
