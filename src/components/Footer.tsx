export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 py-4 px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-8">
        <div className="flex items-center">
          <img
            src="/Logos_do_Estado.jpeg"
            alt="Governo de Alagoas - Secretaria da Primeira Infância - CRIA"
            className="h-12 md:h-16 object-contain"
          />
        </div>

        <div className="flex items-center">
          <img
            src="/IFALHorizontal.png"
            alt="Instituto Federal de Alagoas"
            className="h-10 md:h-14 object-contain"
          />
        </div>
      </div>
    </footer>
  );
}
