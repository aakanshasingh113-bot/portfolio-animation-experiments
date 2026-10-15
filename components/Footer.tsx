import { contact } from '@/data/items';

export function Footer() {
  return (
    <footer id="contact" className="border-t border-line">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-4 px-4 py-10 text-[15px] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li>
            <a className="underline underline-offset-4" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
          </li>
          <li>
            <a className="underline underline-offset-4" href={contact.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </li>
          <li>
            <a className="underline underline-offset-4" href={contact.behance} target="_blank" rel="noreferrer">
              Behance
            </a>
          </li>
        </ul>
        <p className="text-muted">{contact.location}</p>
      </div>
    </footer>
  );
}
